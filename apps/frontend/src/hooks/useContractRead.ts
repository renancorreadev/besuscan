import { useReadContract } from 'wagmi';
import { Address } from 'viem';

export interface ContractFunction {
  name: string;
  type: 'function';
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  inputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
}

export const useContractReadFunction = (
  address: string | undefined,
  abi: any[] | null,
  functionName: string,
  args: any[] = [],
  enabled: boolean = true
) => {
  return useReadContract({
    address: address as Address,
    abi: abi || [],
    functionName,
    args: args.length > 0 ? args : undefined,
    query: {
      enabled: enabled && !!address && !!abi && !!functionName,
      retry: 2,
      staleTime: 30000, // 30 seconds
    }
  });
};

// Função para processar tipos de entrada de forma mais robusta
export const processInputValue = (value: string, type: string): any => {
  if (!value.trim()) return undefined;

  try {
    // Números inteiros (uint8, uint16, uint32, uint64, uint128, uint256, int8, int16, etc.)
    if (type.match(/^u?int(\d+)?$/)) {
      const num = value.replace(/[,_]/g, ''); // Remove separadores
      if (!/^\d+$/.test(num)) {
        throw new Error(`Invalid number format: ${value}`);
      }
      return BigInt(num);
    }
    
    // Boolean
    else if (type === 'bool') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
      throw new Error(`Invalid boolean value: ${value}. Use 'true', 'false', '1', or '0'`);
    }
    
    // Address
    else if (type === 'address') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
        throw new Error(`Invalid address format: ${value}. Must be 42 characters starting with 0x`);
      }
      return value as Address;
    }
    
    // Bytes (bytes, bytes1, bytes2, ..., bytes32)
    else if (type === 'bytes' || type.match(/^bytes\d+$/)) {
      let hexValue = value.trim();
      if (!hexValue.startsWith('0x')) {
        hexValue = `0x${hexValue}`;
      }
      if (!/^0x[a-fA-F0-9]*$/.test(hexValue)) {
        throw new Error(`Invalid bytes format: ${value}. Must be hexadecimal`);
      }
      return hexValue;
    }
    
    // String
    else if (type === 'string') {
      return value;
    }
    
    // Arrays
    else if (type.includes('[]')) {
      const baseType = type.replace('[]', '');
      let arrayData;
      
      try {
        // Tentar parsear como JSON primeiro
        arrayData = JSON.parse(value);
      } catch {
        // Se falhar, tentar parsear como lista separada por vírgulas
        arrayData = value.split(',').map(item => item.trim());
      }
      
      if (!Array.isArray(arrayData)) {
        throw new Error(`Array expected for type ${type}`);
      }
      
      // Processar cada elemento do array recursivamente
      return arrayData.map(item => processInputValue(String(item), baseType));
    }
    
    // Tuples (struct)
    else if (type.startsWith('tuple')) {
      try {
        const tupleData = JSON.parse(value);
        if (!Array.isArray(tupleData)) {
          throw new Error(`Tuple must be an array`);
        }
        return tupleData;
      } catch {
        throw new Error(`Invalid tuple format: ${value}. Must be valid JSON array`);
      }
    }
    
    // Fixed-point numbers (não muito comum, mas pode existir)
    else if (type.match(/^fixed\d*x\d*$/) || type.match(/^ufixed\d*x\d*$/)) {
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new Error(`Invalid fixed-point number: ${value}`);
      }
      return num.toString();
    }
    
    // Fallback para outros tipos
    else {
      console.warn(`Unknown type ${type}, treating as string`);
      return value;
    }
  } catch (error) {
    console.error('Error processing input value:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Invalid ${type} value: ${value}`);
  }
};

// Função para processar tipos de saída de forma mais robusta
export const processOutputValue = (value: any, type: string): string => {
  try {
    // Null ou undefined
    if (value === null || value === undefined) {
      return 'null';
    }
    
    // BigInt (números grandes)
    if (typeof value === 'bigint') {
      const strValue = value.toString();
      // Adicionar formatação para números grandes
      if (strValue.length > 18) {
        const ethValue = Number(value) / 1e18;
        if (ethValue > 0.001) {
          return `${strValue} (${ethValue.toFixed(6)} ETH)`;
        }
      }
      return strValue;
    }
    
    // Boolean
    else if (type === 'bool' || typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    // Address
    else if (type === 'address' && typeof value === 'string') {
      return value;
    }
    
    // String
    else if (type === 'string' && typeof value === 'string') {
      return `"${value}"`;
    }
    
    // Bytes
    else if ((type === 'bytes' || type.match(/^bytes\d+$/)) && typeof value === 'string') {
      return value;
    }
    
    // Arrays
    else if (Array.isArray(value)) {
      const baseType = type.replace('[]', '');
      const processedArray = value.map(item => {
        if (typeof item === 'bigint') {
          return item.toString();
        } else if (typeof item === 'string' && baseType === 'string') {
          return `"${item}"`;
        } else if (typeof item === 'boolean') {
          return item ? 'true' : 'false';
        }
        return item;
      });
      
      return `[\n  ${processedArray.join(',\n  ')}\n]`;
    }
    
    // Tuples/Structs (objetos)
    else if (typeof value === 'object' && value !== null) {
      const processedObj: any = {};
      
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'bigint') {
          processedObj[key] = val.toString();
        } else if (typeof val === 'boolean') {
          processedObj[key] = val ? 'true' : 'false';
        } else if (typeof val === 'string') {
          processedObj[key] = `"${val}"`;
        } else {
          processedObj[key] = val;
        }
      }
      
      return JSON.stringify(processedObj, null, 2);
    }
    
    // Numbers
    else if (typeof value === 'number') {
      return value.toString();
    }
    
    // Fallback
    return value?.toString() || 'null';
    
  } catch (error) {
    console.error('Error processing output value:', error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Função para serializar argumentos para exibição (sem quebrar com BigInt)
export const serializeArgsForDisplay = (args: any[]): string => {
  if (args.length === 0) return 'None';
  
  try {
    const serializedArgs = args.map(arg => {
      if (typeof arg === 'bigint') {
        return arg.toString();
      } else if (typeof arg === 'boolean') {
        return arg ? 'true' : 'false';
      } else if (Array.isArray(arg)) {
        return arg.map(item => 
          typeof item === 'bigint' ? item.toString() : item
        );
      } else if (typeof arg === 'object' && arg !== null) {
        const serialized: any = {};
        for (const [key, value] of Object.entries(arg)) {
          serialized[key] = typeof value === 'bigint' ? value.toString() : value;
        }
        return serialized;
      }
      return arg;
    });
    
    return JSON.stringify(serializedArgs, null, 2);
  } catch (error) {
    console.error('Error serializing args:', error);
    return `[Serialization Error: ${error instanceof Error ? error.message : 'Unknown'}]`;
  }
}; 