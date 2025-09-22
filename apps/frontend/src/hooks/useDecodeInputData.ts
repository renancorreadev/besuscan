import { useState, useEffect } from 'react';
import { useGetAbiDetail } from './useGetAbiDetail';

// Simple keccak256-like hash function (for demo purposes)
// In production, you'd use a proper crypto library
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

// Função auxiliar para converter hex para string de forma compatível
const hexToString = (hex: string): string => {
  try {
    // Tentar usar Buffer se disponível (Node.js)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(hex, 'hex').toString('utf8');
    } else {
      // Fallback para navegador - converter hex para string
      const hexString = hex.replace(/\s/g, '');
      let result = '';
      for (let i = 0; i < hexString.length; i += 2) {
        const charCode = parseInt(hexString.substr(i, 2), 16);
        if (charCode >= 32 && charCode <= 126) { // Caracteres imprimíveis ASCII
          result += String.fromCharCode(charCode);
        } else {
          // Se encontrar caractere não imprimível, parar
          break;
        }
      }
      return result || hex; // Retornar hex se não conseguir converter
    }
  } catch (e) {
    console.error('Error converting hex to string:', e);
    return hex; // Retornar hex em caso de erro
  }
};

interface DecodedParameter {
  name: string;
  type: string;
  value: string;
  formattedValue: string;
  additionalInfo?: string;
  raw: string;
}

interface DecodedInputData {
  methodSignature: string;
  methodName?: string;
  parameters: DecodedParameter[];
  originalData: string;
  decodedHex: string;
}

interface UseDecodeInputDataReturn {
  decodedData: DecodedInputData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDecodeInputData = (
  inputData: string | undefined,
  contractAddress: string | undefined,
  functionName?: string
): UseDecodeInputDataReturn => {
  const [decodedData, setDecodedData] = useState<DecodedInputData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { abi, loading: abiLoading } = useGetAbiDetail(contractAddress);

  const decodeParameter = (type: string, chunk: string, fullHex: string, offset: number): DecodedParameter => {
    const hexValue = '0x' + chunk;
    const decimalValue = BigInt('0x' + chunk);

    switch (type) {
      case 'address':
        const address = '0x' + chunk.slice(24);
        // Verificar se é um endereço válido (não zero)
        const isValidAddress = address !== '0x0000000000000000000000000000000000000000';
        return {
          name: '',
          type: 'address',
          value: address,
          formattedValue: address,
          additionalInfo: isValidAddress ? 'Valid address' : 'Zero address',
          raw: hexValue
        };

      case 'uint256':
      case 'uint':
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
      case 'uint128':
        const value = decimalValue;
        let formattedValue = value.toString();
        let additionalInfo: string | undefined;

        // Formatação inteligente baseada no tamanho do valor
        if (value === BigInt(0)) {
          formattedValue = '0';
          additionalInfo = 'Zero value';
        } else if (value < BigInt(1000)) {
          formattedValue = value.toString();
          additionalInfo = 'Small number';
        } else if (value > BigInt('1000000000000000000')) {
          const ethValue = Number(value) / 1e18;
          formattedValue = value.toLocaleString();
          additionalInfo = `≈ ${ethValue.toFixed(6)} tokens (18 decimals)`;
        } else if (value > BigInt('100000000000000000')) {
          const ethValue = Number(value) / 1e18;
          formattedValue = value.toLocaleString();
          additionalInfo = `≈ ${ethValue.toFixed(6)} ETH (18 decimals)`;
        } else {
          formattedValue = value.toLocaleString();
          additionalInfo = 'Integer value';
        }

        return {
          name: '',
          type,
          value: value.toString(),
          formattedValue,
          additionalInfo,
          raw: hexValue
        };

      case 'int256':
      case 'int':
      case 'int8':
      case 'int16':
      case 'int32':
      case 'int64':
      case 'int128':
        let intFormattedValue = decimalValue.toString();
        let intAdditionalInfo: string | undefined;

        if (decimalValue === BigInt(0)) {
          intFormattedValue = '0';
          intAdditionalInfo = 'Zero value';
        } else if (decimalValue < BigInt(0)) {
          intFormattedValue = decimalValue.toString();
          intAdditionalInfo = 'Negative integer';
        } else {
          intFormattedValue = decimalValue.toLocaleString();
          intAdditionalInfo = 'Positive integer';
        }

        return {
          name: '',
          type,
          value: decimalValue.toString(),
          formattedValue: intFormattedValue,
          additionalInfo: intAdditionalInfo,
          raw: hexValue
        };

      case 'string':
        try {
          // Para strings, o primeiro parâmetro é o offset (posição) onde a string está
          // O valor real da string está em outra posição
          const stringOffset = Number(decimalValue);
          const stringStart = stringOffset * 2; // Converter para posição em hex chars

          // Ler o tamanho da string (próximos 32 bytes)
          const lengthHex = fullHex.slice(stringStart, stringStart + 64);
          const stringLength = parseInt(lengthHex, 16);

          // Ler os dados da string
          const stringDataHex = fullHex.slice(stringStart + 64, stringStart + 64 + (stringLength * 2));

          // Usar função auxiliar para converter hex para string
          const decodedString = hexToString(stringDataHex);

          return {
            name: '',
            type: 'string',
            value: decodedString,
            formattedValue: decodedString,
            additionalInfo: `${stringLength} chars`,
            raw: hexValue
          };
        } catch (e) {
          console.error('Error decoding string:', e);
          return {
            name: '',
            type: 'string',
            value: hexValue,
            formattedValue: hexValue,
            additionalInfo: 'Failed to decode string',
            raw: hexValue
          };
        }

            case 'bytes':
        try {
          // Para bytes dinâmicos, o primeiro parâmetro é o offset (posição) onde os bytes estão
          const bytesOffset = Number(decimalValue);
          const bytesStart = bytesOffset * 2; // Converter para posição em hex chars

          // Ler o tamanho dos bytes (próximos 32 bytes)
          const lengthHex = fullHex.slice(bytesStart, bytesStart + 64);
          const bytesLength = parseInt(lengthHex, 16);

          // Ler os dados dos bytes
          const bytesDataHex = fullHex.slice(bytesStart + 64, bytesStart + 64 + (bytesLength * 2));

          // Tentar decodificar como string se possível
          let formattedValue = bytesDataHex;
          let bytesAdditionalInfo = `${bytesLength} bytes`;

          const decodedString = hexToString(bytesDataHex);
          if (decodedString !== bytesDataHex && decodedString.length > 0) {
            formattedValue = decodedString;
            bytesAdditionalInfo = `${bytesLength} bytes (decoded as string)`;
          }

          return {
            name: '',
            type,
            value: bytesDataHex,
            formattedValue,
            additionalInfo: bytesAdditionalInfo,
            raw: hexValue
          };
        } catch (e) {
          console.error('Error decoding bytes:', e);
          return {
            name: '',
            type,
            value: hexValue,
            formattedValue: hexValue,
            additionalInfo: `${chunk.length/2} bytes`,
            raw: hexValue
          };
        }

      case 'bytes32':
      case 'bytes4':
        // Para bytes com tamanho fixo, o valor está diretamente no chunk
        try {
          // Tentar decodificar como string se possível
          const decodedString = hexToString(chunk);
          let formattedValue = chunk;
          let bytesFixedInfo = `${chunk.length/2} bytes (fixed size)`;

          if (decodedString !== chunk && decodedString.length > 0) {
            formattedValue = decodedString;
            bytesFixedInfo = `${chunk.length/2} bytes (decoded as string)`;
          }

          return {
            name: '',
            type,
            value: '0x' + chunk,
            formattedValue,
            additionalInfo: bytesFixedInfo,
            raw: hexValue
          };
        } catch (e) {
          console.error('Error decoding fixed bytes:', e);
          return {
            name: '',
            type,
            value: '0x' + chunk,
            formattedValue: '0x' + chunk,
            additionalInfo: `${chunk.length/2} bytes (fixed size)`,
            raw: hexValue
          };
        }

      case 'bool':
        const boolValue = decimalValue === BigInt(1);
        return {
          name: '',
          type: 'bool',
          value: boolValue.toString(),
          formattedValue: boolValue ? 'true' : 'false',
          raw: hexValue
        };

      default:
        // Try to detect if it's an address or number
        if (chunk.startsWith('000000000000000000000000')) {
          const address = '0x' + chunk.slice(24);
          const isValidAddress = address !== '0x0000000000000000000000000000000000000000';
          return {
            name: '',
            type: 'address',
            value: address,
            formattedValue: address,
            additionalInfo: isValidAddress ? 'Detected as address' : 'Zero address (detected)',
            raw: hexValue
          };
        }

        // Se não é endereço, provavelmente é um número
        let detectedType = 'uint256';
        let detectedAdditionalInfo = 'Detected as uint256';

        if (decimalValue === BigInt(0)) {
          detectedAdditionalInfo = 'Zero value (detected)';
        } else if (decimalValue < BigInt(1000)) {
          detectedAdditionalInfo = 'Small number (detected)';
        } else if (decimalValue > BigInt('1000000000000000000000000000000000000000000000000000000000000000000')) {
          detectedAdditionalInfo = 'Very large number (detected)';
        }

        return {
          name: '',
          type: detectedType,
          value: decimalValue.toString(),
          formattedValue: decimalValue.toLocaleString(),
          additionalInfo: detectedAdditionalInfo,
          raw: hexValue
        };
    }
  };

          const decodeWithABI = (methodSignature: string, parametersHex: string): DecodedInputData | null => {
    console.log('decodeWithABI: Starting ABI decode');
    console.log('decodeWithABI: ABI available:', !!abi);
    console.log('decodeWithABI: ABI length:', abi?.length);
    console.log('decodeWithABI: Parameters hex length:', parametersHex.length);
    console.log('decodeWithABI: Method signature (first 4 bytes):', methodSignature);
    console.log('decodeWithABI: Function name from transaction:', functionName);

    if (!abi) {
      console.log('decodeWithABI: No ABI available');
      return null;
    }

    const functions = abi.filter(item => item.type === 'function');
    console.log('decodeWithABI: Found functions:', functions.length);

    // PRIMEIRO: Se temos o nome da função, usar diretamente!
    let targetFunction = null;
    if (functionName) {
      targetFunction = functions.find((item) => item.name === functionName);
      console.log(`decodeWithABI: Looking for function "${functionName}" in ABI`);
      if (targetFunction) {
        console.log(`decodeWithABI: Found function "${functionName}" with ${targetFunction.inputs?.length || 0} inputs`);
      } else {
        console.log(`decodeWithABI: Function "${functionName}" not found in ABI`);
      }
    }

    // SEGUNDO: Se não encontrou pelo nome, tentar pelo hash (fallback)
    if (!targetFunction) {
      console.log('decodeWithABI: No function found by name, trying hash fallback...');

      targetFunction = functions.find((item) => {
        if (!item.inputs) return false;

        // Create function signature: functionName(param1Type,param2Type,...)
        const inputTypes = item.inputs.map(input => input.type).join(',');
        const signature = `${item.name}(${inputTypes})`;
        console.log(`decodeWithABI: Function signature: ${signature}`);

        // Calculate hash and compare with method signature
        const hash = simpleHash(signature);
        const expectedSignature = '0x' + hash;
        console.log(`decodeWithABI: Expected signature: ${expectedSignature}, actual: ${methodSignature}`);

        // Check if the hash matches (first 8 chars after 0x)
        const hashMatch = methodSignature === expectedSignature;
        console.log(`decodeWithABI: Hash match: ${hashMatch}`);

        return hashMatch;
      });
    }

        // If no function found by hash, try to find by parameter count
    if (!targetFunction) {
      console.log('decodeWithABI: No function found by hash, trying parameter count...');

      targetFunction = functions.find((item) => {
        if (!item.inputs) return false;

        // Check if the parameter count matches
        const expectedLength = item.inputs.length * 64; // 32 bytes per parameter
        const matches = parametersHex.length === expectedLength;
        console.log(`decodeWithABI: Function ${item.name} has ${item.inputs.length} inputs, expected length: ${expectedLength}, actual: ${parametersHex.length}, matches: ${matches}`);

        return matches;
      });
    }

    // If still no function found, try to find by analyzing the data structure more intelligently
    if (!targetFunction) {
      console.log('decodeWithABI: No function found by parameter count, trying intelligent data analysis...');

      // Analyze the data to find the most likely function
      const totalBytes = parametersHex.length / 2;
      const paramCount = Math.floor(totalBytes / 32);

      console.log(`decodeWithABI: Data analysis - total bytes: ${totalBytes}, estimated params: ${paramCount}`);

      // Look for functions with the exact parameter count
      const exactMatches = functions.filter(func =>
        func.inputs && func.inputs.length === paramCount
      );

      if (exactMatches.length > 0) {
        console.log(`decodeWithABI: Found ${exactMatches.length} functions with ${paramCount} parameters`);

        // If multiple functions, try to find the most likely one based on data patterns
        if (exactMatches.length === 1) {
          targetFunction = exactMatches[0];
          console.log(`decodeWithABI: Single exact match found: ${targetFunction.name}`);
        } else {
          // Multiple functions with same parameter count - try to find the most likely one
          console.log('decodeWithABI: Multiple functions with same parameter count, analyzing data patterns...');

          // Look for patterns in the first parameter to help identify the function
          const firstParamHex = parametersHex.slice(0, 64);
          const firstParamValue = BigInt('0x' + firstParamHex);

          console.log(`decodeWithABI: First parameter value: ${firstParamValue.toString()}`);

          // Try to find a function that makes sense with this data
          for (const func of exactMatches) {
            if (func.inputs && func.inputs[0]) {
              const firstInputType = func.inputs[0].type;
              console.log(`decodeWithABI: Function ${func.name} has first input type: ${firstInputType}`);

              // If first parameter looks like an address and first input is address type
              if (firstInputType === 'address' && firstParamHex.startsWith('000000000000000000000000')) {
                targetFunction = func;
                console.log(`decodeWithABI: Selected function ${func.name} based on address pattern`);
                break;
              }

              // If first parameter is a reasonable number and first input is uint/int
              if ((firstInputType.includes('uint') || firstInputType.includes('int')) &&
                  firstParamValue < BigInt('1000000000000000000000000000000000000000000000000000000000000000000')) {
                targetFunction = func;
                console.log(`decodeWithABI: Selected function ${func.name} based on number pattern`);
                break;
              }
            }
          }

          // If still no function selected, pick the first one
          if (!targetFunction && exactMatches.length > 0) {
            targetFunction = exactMatches[0];
            console.log(`decodeWithABI: No pattern match found, using first function: ${targetFunction.name}`);
          }
        }
      } else {
        console.log(`decodeWithABI: No functions found with ${paramCount} parameters`);

        // Last resort: find any function with reasonable parameter count
        for (const func of functions) {
          if (!func.inputs || func.inputs.length === 0) continue;

          const paramCount = func.inputs.length;
          if (paramCount <= 10 && paramCount > 0) { // Reasonable limit
            console.log(`decodeWithABI: Considering function ${func.name} with ${paramCount} inputs as last resort`);
            targetFunction = func;
            break;
          }
        }
      }
    }

        // If still no function found, try to find by analyzing the data structure
    if (!targetFunction) {
      console.log('decodeWithABI: No function found by parameter count, trying to analyze data structure...');

      // Analyze the data to find the most likely function
      const totalBytes = parametersHex.length / 2;
      const paramCount = Math.floor(totalBytes / 32);

      console.log(`decodeWithABI: Data analysis - total bytes: ${totalBytes}, estimated params: ${paramCount}`);

      // Look for functions with the exact parameter count
      const exactMatches = functions.filter(func =>
        func.inputs && func.inputs.length === paramCount
      );

      if (exactMatches.length > 0) {
        console.log(`decodeWithABI: Found ${exactMatches.length} functions with ${paramCount} parameters`);

        // If multiple functions, try to find the most likely one based on data patterns
        if (exactMatches.length === 1) {
          targetFunction = exactMatches[0];
          console.log(`decodeWithABI: Single exact match found: ${targetFunction.name}`);
        } else {
          // Multiple functions with same parameter count - try to find the most likely one
          console.log('decodeWithABI: Multiple functions with same parameter count, analyzing data patterns...');

          // Look for patterns in the first parameter to help identify the function
          const firstParamHex = parametersHex.slice(0, 64);
          const firstParamValue = BigInt('0x' + firstParamHex);

          console.log(`decodeWithABI: First parameter value: ${firstParamValue.toString()}`);

          // Try to find a function that makes sense with this data
          for (const func of exactMatches) {
            if (func.inputs && func.inputs[0]) {
              const firstInputType = func.inputs[0].type;
              console.log(`decodeWithABI: Function ${func.name} has first input type: ${firstInputType}`);

              // If first parameter looks like an address and first input is address type
              if (firstInputType === 'address' && firstParamHex.startsWith('000000000000000000000000')) {
                targetFunction = func;
                console.log(`decodeWithABI: Selected function ${func.name} based on address pattern`);
                break;
              }

              // If first parameter is a reasonable number and first input is uint/int
              if ((firstInputType.includes('uint') || firstInputType.includes('int')) &&
                  firstParamValue < BigInt('1000000000000000000000000000000000000000000000000000000000000000000')) {
                targetFunction = func;
                console.log(`decodeWithABI: Selected function ${func.name} based on number pattern`);
                break;
              }
            }
          }

          // If still no function selected, pick the first one
          if (!targetFunction && exactMatches.length > 0) {
            targetFunction = exactMatches[0];
            console.log(`decodeWithABI: No pattern match found, using first function: ${targetFunction.name}`);
          }
        }
      } else {
        console.log(`decodeWithABI: No functions found with ${paramCount} parameters`);

        // Last resort: find any function with reasonable parameter count
        for (const func of functions) {
          if (!func.inputs || func.inputs.length === 0) continue;

          const paramCount = func.inputs.length;
          if (paramCount <= 10 && paramCount > 0) { // Reasonable limit
            console.log(`decodeWithABI: Considering function ${func.name} with ${paramCount} inputs as last resort`);
            targetFunction = func;
            break;
          }
        }
      }
    }

    if (!targetFunction || !targetFunction.inputs) {
      console.log('decodeWithABI: No matching function found');
      return null;
    }

    console.log('decodeWithABI: Using function:', targetFunction.name, 'with', targetFunction.inputs.length, 'inputs');

    // Decode parameters using ABI
    const parameters: DecodedParameter[] = [];

    for (let i = 0; i < targetFunction.inputs.length; i++) {
      const input = targetFunction.inputs[i];
      const chunk = parametersHex.slice(i * 64, (i + 1) * 64);

      if (chunk.length !== 64) break;

      const decodedParam = decodeParameter(input.type, chunk, parametersHex, i * 64);
      decodedParam.name = input.name || `param_${i}`;

      parameters.push(decodedParam);
    }

    const result = {
      methodSignature,
      methodName: targetFunction.name,
      parameters,
      originalData: inputData || '',
      decodedHex: '0x' + methodSignature.slice(2) + parametersHex
    };

    console.log('decodeWithABI: Successfully decoded', parameters.length, 'parameters');
    return result;
  };

    // Improved basic parameter decoding - only show actual function parameters
  const decodeBasicParameters = (parametersHex: string): DecodedInputData => {
    const parameters: DecodedParameter[] = [];

    // For basic decoding, we'll try to intelligently determine how many parameters there are
    // by looking at the data structure and common patterns

    // If we have ABI but couldn't match the function, try to infer from data length
    if (abi) {
      // Look for common function patterns
      const possibleFunctions = abi.filter(item => item.type === 'function');

      // Try to find a function that matches the data length
      for (const func of possibleFunctions) {
        if (func.inputs && func.inputs.length > 0) {
          const expectedLength = func.inputs.length * 64; // 32 bytes per parameter

          if (parametersHex.length === expectedLength) {
            // This might be our function, decode with these inputs
            for (let i = 0; i < func.inputs.length; i++) {
              const input = func.inputs[i];
              const chunk = parametersHex.slice(i * 64, (i + 1) * 64);

              if (chunk.length === 64) {
                const decodedParam = decodeParameter(input.type, chunk, parametersHex, i * 64);
                decodedParam.name = input.name || `param_${i}`;
                parameters.push(decodedParam);
              }
            }

            if (parameters.length > 0) {
              return {
                methodSignature: '0x' + (inputData?.slice(0, 10) || ''),
                methodName: func.name,
                parameters,
                originalData: inputData || '',
                decodedHex: '0x' + (inputData?.slice(0, 10) || '') + parametersHex
              };
            }
          }
        }
      }
    }

    // Fallback: try to intelligently determine parameter count
    // Look for patterns that suggest this is a reasonable number of parameters
    const totalBytes = parametersHex.length / 2;
    const maxReasonableParams = Math.min(8, Math.floor(totalBytes / 32)); // Max 8 params, 32 bytes each

    // Only show parameters if we have a reasonable number and the data makes sense
    if (maxReasonableParams <= 8 && maxReasonableParams > 0) {
      // Additional check: look for patterns that suggest this is actually function parameters
      // rather than just raw data
      let hasReasonableValues = true;

      // Check first few parameters to see if they make sense
      for (let i = 0; i < Math.min(3, maxReasonableParams); i++) {
        const chunk = parametersHex.slice(i * 64, (i + 1) * 64);
        if (chunk.length === 64) {
          const decimalValue = BigInt('0x' + chunk);

          // If we have extremely large values that don't look like reasonable parameters, skip
          if (decimalValue > BigInt('1000000000000000000000000000000000000000000000000000000000000000000')) {
            hasReasonableValues = false;
            break;
          }
        }
      }

      if (hasReasonableValues) {
        for (let i = 0; i < maxReasonableParams; i++) {
          const chunk = parametersHex.slice(i * 64, (i + 1) * 64);

          if (chunk.length === 64) {
            const hexValue = '0x' + chunk;
            const decimalValue = BigInt('0x' + chunk);

            // Default to uint256
            let paramType = 'uint256';
            let formattedValue = decimalValue.toString();
            let additionalInfo: string | undefined;

            // Address detection
            if (chunk.startsWith('000000000000000000000000') && chunk.length === 64) {
              const addressPart = chunk.slice(24);
              const address = '0x' + addressPart;

              // Check if it looks like an address
              const hexLetters = (addressPart.match(/[a-fA-F]/g) || []).length;
              const notZeroAddress = address !== '0x0000000000000000000000000000000000000000';
              const endsWithManyZeros = addressPart.match(/0{8,}$/);
              const isTokenAmount = decimalValue > BigInt('1000000000000000000');
              const hasTypicalAddressPattern = /[a-fA-F].*[0-9]|[0-9].*[a-fA-F]/.test(addressPart);

              if (notZeroAddress &&
                  hexLetters >= 3 &&
                  !endsWithManyZeros &&
                  !isTokenAmount &&
                  hasTypicalAddressPattern) {
                paramType = 'address';
                formattedValue = address;
              }
            }

            // Format uint256 values for better display
            if (paramType === 'uint256') {
              const value = BigInt(formattedValue);
              if (value > BigInt('1000000000000000000')) { // > 1 ETH in wei
                const ethValue = Number(value) / 1e18;
                formattedValue = value.toLocaleString();
                additionalInfo = `≈ ${ethValue.toFixed(6)} tokens`;
              } else {
                formattedValue = value.toLocaleString();
              }
            }

            parameters.push({
              name: `param_${i}`,
              type: paramType,
              value: decimalValue.toString(),
              formattedValue,
              additionalInfo,
              raw: hexValue
            });
          }
        }
      }
    }

    return {
      methodSignature: '0x' + (inputData?.slice(0, 10) || ''),
      parameters,
      originalData: inputData || '',
      decodedHex: '0x' + (inputData?.slice(0, 10) || '') + parametersHex
    };
  };



  const decodeInputData = async () => {
    console.log('useDecodeInputData: Starting decode for inputData:', inputData?.substring(0, 50) + '...');
    console.log('useDecodeInputData: Contract address:', contractAddress);
    console.log('useDecodeInputData: ABI available:', !!abi);
    console.log('useDecodeInputData: ABI loading:', abiLoading);

    if (!inputData || inputData === '0x') {
      console.log('useDecodeInputData: No input data or empty data');
      setDecodedData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let hexData: string;

      // Check if input is base64 or hex
      if (inputData.startsWith('0x')) {
        // Already hex format
        hexData = inputData;
        console.log('useDecodeInputData: Input is already hex format');
      } else {
        // Assume base64, convert to hex
        console.log('useDecodeInputData: Converting base64 to hex');
        try {
          const binaryString = atob(inputData);
          hexData = '0x' + Array.from(binaryString)
            .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('');
          console.log('useDecodeInputData: Converted to hex:', hexData.substring(0, 50) + '...');
        } catch (e) {
          throw new Error('Failed to decode base64 data');
        }
      }

      if (hexData === '0x' || hexData.length < 10) {
        throw new Error('Invalid input data format');
      }

      // Extract method signature (first 4 bytes = 8 hex chars after 0x)
      const methodSignature = hexData.slice(0, 10);
      const parametersHex = hexData.slice(10);

      console.log('useDecodeInputData: Method signature:', methodSignature);
      console.log('useDecodeInputData: Parameters hex length:', parametersHex.length);

      if (parametersHex.length === 0) {
        throw new Error('No parameters found in input data');
      }

      // Try to decode with ABI first, then fallback to basic decoding
      console.log('useDecodeInputData: Attempting ABI decode...');
      const decodedWithABI = decodeWithABI(methodSignature, parametersHex);
      console.log('useDecodeInputData: ABI decode result:', decodedWithABI);

      if (!decodedWithABI) {
        console.log('useDecodeInputData: ABI decode failed, trying basic decode...');
      }

      const decoded = decodedWithABI || decodeBasicParameters(parametersHex);
      console.log('useDecodeInputData: Final decode result:', decoded);

      setDecodedData(decoded);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decode input data';
      console.error('useDecodeInputData: Error during decode:', err);
      setError(errorMessage);
      setDecodedData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inputData && !abiLoading) {
      decodeInputData();
    }
  }, [inputData, abi, abiLoading]);

  const refetch = () => {
    decodeInputData();
  };

  return {
    decodedData,
    loading: loading || abiLoading,
    error,
    refetch
  };
};
