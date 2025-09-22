import { useState, useEffect } from 'react';
import { useGetAbiDetail } from './useGetAbiDetail';

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

interface DecodedEventParameter {
  name: string;
  type: string;
  value: string;
  formattedValue: string;
  additionalInfo?: string;
  raw: string;
  indexed: boolean;
}

interface DecodedEventData {
  eventName: string;
  eventSignature: string;
  parameters: DecodedEventParameter[];
  rawData: string;
}

interface UseDecodeEventDataReturn {
  decodedData: DecodedEventData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDecodeEventData = (
  eventName: string | undefined,
  eventSignature: string | undefined,
  topics: string[] | undefined,
  rawData: string | undefined,
  contractAddress: string | undefined
): UseDecodeEventDataReturn => {
  const [decodedData, setDecodedData] = useState<DecodedEventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { abi, loading: abiLoading } = useGetAbiDetail(contractAddress);

      // Função para detectar se um campo deve ser tratado como hash
  const shouldTreatAsHash = (type: string, paramName?: string): boolean => {
    // Sempre tratar bytes32 como hash
    if (type === 'bytes32') return true;

    // Verificar se o nome do parâmetro sugere que é um hash
    if (paramName) {
      const hashKeywords = ['hash', 'hash_', 'key', 'id', 'identifier'];
      return hashKeywords.some(keyword =>
        paramName.toLowerCase().includes(keyword)
      );
    }

    return false;
  };

  // Função para detectar se um campo deve ser tratado como timestamp
  const shouldTreatAsTimestamp = (type: string, paramName?: string): boolean => {
    // Verificar se o tipo é uint256 ou uint
    if (!type.includes('uint')) return false;

    // Verificar se o nome do parâmetro sugere que é um timestamp
    if (paramName) {
      const timestampKeywords = ['time', 'timestamp', 'date', 'validto', 'expires', 'deadline', 'start', 'end', 'created', 'updated'];
      return timestampKeywords.some(keyword =>
        paramName.toLowerCase().includes(keyword)
      );
    }

    return false;
  };

  const decodeEventParameter = (type: string, chunk: string, fullHex: string, offset: number, paramName?: string): DecodedEventParameter => {
    const hexValue = '0x' + chunk;

    // Validar se o chunk é válido antes de converter para BigInt
    if (!chunk || chunk.length !== 64) {
      return {
        name: '',
        type: 'invalid',
        value: hexValue,
        formattedValue: 'Invalid chunk length',
        additionalInfo: `Expected 64 chars, got ${chunk?.length || 0}`,
        raw: hexValue,
        indexed: false
      };
    }

    // Verificar se contém apenas caracteres hex válidos
    if (!/^[0-9a-fA-F]+$/.test(chunk)) {
      // Tentar limpar caracteres inválidos
      const cleanedChunk = chunk.replace(/[^0-9a-fA-F]/g, '0');
      console.warn(`Cleaned invalid hex chunk: ${chunk} -> ${cleanedChunk}`);

      if (cleanedChunk.length === 64) {
        // Usar o chunk limpo
        return decodeEventParameter(type, cleanedChunk, fullHex, offset);
      }

      return {
        name: '',
        type: 'invalid',
        value: hexValue,
        formattedValue: 'Invalid hex characters',
        additionalInfo: `Contains non-hex characters: ${chunk.match(/[^0-9a-fA-F]/g)?.join(', ')}`,
        raw: hexValue,
        indexed: false
      };
    }

    let decimalValue: bigint;
    try {
      decimalValue = BigInt('0x' + chunk);
    } catch (e) {
      console.error('Error converting hex to BigInt:', chunk, e);
      return {
        name: '',
        type: 'invalid',
        value: hexValue,
        formattedValue: 'Conversion error',
        additionalInfo: 'Failed to convert to BigInt',
        raw: hexValue,
        indexed: false
      };
    }

    switch (type) {
      case 'address':
        const address = '0x' + chunk.slice(24);
        const isValidAddress = address !== '0x0000000000000000000000000000000000000000';
        return {
          name: '',
          type: 'address',
          value: address,
          formattedValue: address,
          additionalInfo: isValidAddress ? 'Valid address' : 'Zero address',
          raw: hexValue,
          indexed: false
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

        // Detectar se é um timestamp Unix (entre 2020 e 2030) ou se o nome sugere timestamp
        const timestampThreshold = 1577836800n; // 2020-01-01
        const futureThreshold = 1893456000n;    // 2030-01-01
        const isLikelyTimestamp = shouldTreatAsTimestamp(type, paramName);

        if (isLikelyTimestamp || (value >= timestampThreshold && value <= futureThreshold)) {
          try {
            const date = new Date(Number(value) * 1000);
            const now = new Date();
            const isFuture = date > now;

            formattedValue = date.toLocaleString('pt-BR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            });

            const timeAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
            let timeDescription = '';

            if (isFuture) {
              timeDescription = 'Futuro';
            } else if (timeAgo < 60) {
              timeDescription = `${timeAgo}s atrás`;
            } else if (timeAgo < 3600) {
              timeDescription = `${Math.floor(timeAgo / 60)}m atrás`;
            } else if (timeAgo < 86400) {
              timeDescription = `${Math.floor(timeAgo / 86400)}d atrás`;
            } else if (timeAgo < 2592000) {
              timeDescription = `${Math.floor(timeAgo / 2592000)}m atrás`;
            } else {
              timeDescription = `${Math.floor(timeAgo / 2592000)}m atrás`;
            }

            additionalInfo = `Timestamp Unix (${timeDescription})`;
          } catch (e) {
            // Se falhar na conversão, usar formatação padrão
            formattedValue = value.toLocaleString();
            additionalInfo = 'Integer value (possible timestamp)';
          }
        } else
        if (value === 0n) {
          formattedValue = '0';
          additionalInfo = 'Zero value';
        } else if (value < 1000n) {
          formattedValue = value.toString();
          additionalInfo = 'Small number';
        } else if (value > 1000000000000000000n) {
          const ethValue = Number(value) / 1e18;
          formattedValue = value.toLocaleString();
          additionalInfo = `≈ ${ethValue.toFixed(6)} tokens (18 decimals)`;
        } else if (value > 100000000000000000n) {
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
          raw: hexValue,
          indexed: false
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

        if (decimalValue === 0n) {
          intFormattedValue = '0';
          intAdditionalInfo = 'Zero value';
        } else if (decimalValue < 0n) {
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
          raw: hexValue,
          indexed: false
        };

      case 'string':
        try {
          // Para strings em eventos, o valor pode estar diretamente no chunk ou ser um offset
          // Vamos tentar decodificar diretamente primeiro
          const decodedString = hexToString(chunk);

          // Se conseguiu decodificar e não é apenas hex, usar o resultado
          if (decodedString !== chunk && decodedString.length > 0 && /^[a-zA-Z0-9\s\-_\.\/:]+$/.test(decodedString)) {
            return {
              name: '',
              type: 'string',
              value: decodedString,
              formattedValue: decodedString,
              additionalInfo: `${decodedString.length} chars (direct decode)`,
              raw: hexValue,
              indexed: false
            };
          }

          // Se não conseguiu decodificar diretamente, tentar como offset
          const stringOffset = Number(decimalValue);
          if (stringOffset > 0 && stringOffset < fullHex.length / 2) {
            const stringStart = stringOffset * 2;
            const lengthHex = fullHex.slice(stringStart, stringStart + 64);
            const stringLength = parseInt(lengthHex, 16);

            if (stringLength > 0 && stringLength < 1000) { // Validação de tamanho razoável
              const stringDataHex = fullHex.slice(stringStart + 64, stringStart + 64 + (stringLength * 2));
              const offsetDecodedString = hexToString(stringDataHex);

              if (offsetDecodedString.length > 0) {
                return {
                  name: '',
                  type: 'string',
                  value: offsetDecodedString,
                  formattedValue: offsetDecodedString,
                  additionalInfo: `${stringLength} chars (offset decode)`,
                  raw: hexValue,
                  indexed: false
                };
              }
            }
          }

          // Fallback: mostrar como hex
          return {
            name: '',
            type: 'string',
            value: hexValue,
            formattedValue: hexValue,
            additionalInfo: 'Could not decode as string',
            raw: hexValue,
            indexed: false
          };
        } catch (e) {
          console.error('Error decoding string:', e);
          return {
            name: '',
            type: 'string',
            value: hexValue,
            formattedValue: hexValue,
            additionalInfo: 'Failed to decode string',
            raw: hexValue,
            indexed: false
          };
        }

      case 'bytes':
        try {
          // Para bytes em eventos, tentar decodificar diretamente primeiro
          const decodedBytesString = hexToString(chunk);

          // Se conseguiu decodificar e parece ser texto válido
          if (decodedBytesString !== chunk && decodedBytesString.length > 0 && /^[a-zA-Z0-9\s\-_\.\/:]+$/.test(decodedBytesString)) {
            return {
              name: '',
              type,
              value: decodedBytesString,
              formattedValue: decodedBytesString,
              additionalInfo: `${chunk.length/2} bytes (decoded as string)`,
              raw: hexValue,
              indexed: false
            };
          }

          // Se não conseguiu decodificar diretamente, tentar como offset
          const bytesOffset = Number(decimalValue);
          if (bytesOffset > 0 && bytesOffset < fullHex.length / 2) {
            const bytesStart = bytesOffset * 2;
            const lengthHex = fullHex.slice(bytesStart, bytesStart + 64);
            const bytesLength = parseInt(lengthHex, 16);

            if (bytesLength > 0 && bytesLength < 1000) {
              const bytesDataHex = fullHex.slice(bytesStart + 64, bytesStart + 64 + (bytesLength * 2));
              const offsetDecodedBytes = hexToString(bytesDataHex);

              if (offsetDecodedBytes.length > 0) {
                return {
                  name: '',
                  type,
                  value: offsetDecodedBytes,
                  formattedValue: offsetDecodedBytes,
                  additionalInfo: `${bytesLength} bytes (offset decode)`,
                  raw: hexValue,
                  indexed: false
                };
              }
            }
          }

          // Fallback: mostrar como hex
          return {
            name: '',
            type,
            value: hexValue,
            formattedValue: hexValue,
            additionalInfo: `${chunk.length/2} bytes (hex)`,
            raw: hexValue,
            indexed: false
          };
        } catch (e) {
          console.error('Error decoding bytes:', e);
          return {
            name: '',
            type,
            value: hexValue,
            formattedValue: hexValue,
            additionalInfo: `${chunk.length/2} bytes`,
            raw: hexValue,
            indexed: false
          };
        }

      case 'bytes32':
      case 'bytes4':
        // Para bytes com tamanho fixo, o valor está diretamente no chunk
        // Para hashes, sempre mostrar o valor hex original
        // Verificar se é um hash baseado no tipo e nome do parâmetro
        const isHash = shouldTreatAsHash(type, paramName);

        if (isHash) {
          // Para hashes, mostrar apenas o valor hex original
          return {
            name: '',
            type,
            value: '0x' + chunk,
            formattedValue: '0x' + chunk,
            additionalInfo: '32 bytes (hash)',
            raw: hexValue,
            indexed: false
          };
        }

        // Para outros bytes fixos, tentar decodificar como string se possível
        try {
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
            raw: hexValue,
            indexed: false
          };
        } catch (e) {
          console.error('Error decoding fixed bytes:', e);
          return {
            name: '',
            type,
            value: '0x' + chunk,
            formattedValue: '0x' + chunk,
            additionalInfo: `${chunk.length/2} bytes (fixed size)`,
            raw: hexValue,
            indexed: false
          };
        }

      case 'bool':
        const boolValue = decimalValue === BigInt(1);
        return {
          name: '',
          type: 'bool',
          value: boolValue.toString(),
          formattedValue: boolValue ? 'true' : 'false',
          raw: hexValue,
          indexed: false
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
            raw: hexValue,
            indexed: false
          };
        }

        // Se não é endereço, provavelmente é um número
        let detectedType = 'uint256';
        let detectedAdditionalInfo = 'Detected as uint256';

        if (decimalValue === 0n) {
          detectedAdditionalInfo = 'Zero value (detected)';
        } else if (decimalValue < 1000n) {
          detectedAdditionalInfo = 'Very large number (detected)';
        }

        return {
          name: '',
          type: detectedType,
          value: decimalValue.toString(),
          formattedValue: decimalValue.toLocaleString(),
          additionalInfo: detectedAdditionalInfo,
          raw: hexValue,
          indexed: false
        };
    }
  };

  const decodeEventWithABI = (): DecodedEventData | null => {
    if (!abi || !eventName || !topics || !rawData) {
      return null;
    }

    // Encontrar o evento na ABI
    const eventAbi = abi.find(item =>
      item.type === 'event' && item.name === eventName
    ) as any;

    if (!eventAbi) {
      console.warn('Event not found in ABI:', eventName);
      return null;
    }

    console.log('Found event in ABI:', eventAbi);
    console.log('Topics:', topics);
    console.log('Raw data:', rawData);

    const decodedParameters = [];

    // Decodificar parâmetros indexados (topics 1, 2, 3)
    const indexedInputs = eventAbi.inputs.filter(input => input.indexed);
    for (let i = 0; i < indexedInputs.length && i < topics.length - 1; i++) {
      const input = indexedInputs[i];
      const topic = topics[i + 1]; // +1 porque topic[0] é a assinatura

      if (topic && topic.startsWith('0x') && topic.length === 66) {
        try {
          const topicHex = topic.slice(2);
          const decodedParam = decodeEventParameter(input.type, topicHex, rawData || '', 0, input.name);
          decodedParam.name = input.name || `param_${i}`;
          decodedParam.indexed = true;
          decodedParameters.push(decodedParam);
          console.log(`Decoded indexed parameter ${input.name}:`, decodedParam);
        } catch (e) {
          console.error(`Error decoding indexed parameter ${input.name}:`, e);
          decodedParameters.push({
            name: input.name || `param_${i}`,
            type: input.type,
            value: 'Decoding error',
            formattedValue: 'Failed to decode',
            additionalInfo: 'Error occurred during decoding',
            raw: topic,
            indexed: true
          });
        }
      }
    }

    // Decodificar parâmetros não indexados (raw data)
    const nonIndexedInputs = eventAbi.inputs.filter(input => !input.indexed);
    if (rawData && rawData !== '0x' && nonIndexedInputs.length > 0) {
      let rawDataHex = rawData.slice(2);
      console.log('Raw data hex length:', rawDataHex.length);
      console.log('Non-indexed inputs:', nonIndexedInputs.map(i => `${i.name} (${i.type})`));
      console.log('Raw data first 200 chars:', rawDataHex.substring(0, 200));
      console.log('Raw data last 200 chars:', rawDataHex.substring(rawDataHex.length - 200));

      // Verificar se o raw data está corrompido
      const invalidChars = rawDataHex.match(/[^0-9a-fA-F]/g);
      if (invalidChars) {
        console.warn('Raw data contains invalid characters:', [...new Set(invalidChars)]);
        console.warn('Invalid char positions:', invalidChars.map((char, i) => ({ char, pos: rawDataHex.indexOf(char) })));

        // Tentar limpar o raw data
        const originalLength = rawDataHex.length;
        rawDataHex = rawDataHex.replace(/[^0-9a-fA-F]/g, '0');
        console.warn(`Cleaned raw data: ${originalLength} -> ${rawDataHex.length} chars`);
      }

      // Para eventos com strings/bytes dinâmicos, o raw data tem offsets
      // Vamos usar uma abordagem mais simples: decodificar cada chunk de 32 bytes
      for (let i = 0; i < nonIndexedInputs.length; i++) {
        const input = nonIndexedInputs[i];
        const startPos = i * 64;
        const chunk = rawDataHex.slice(startPos, startPos + 64);

        console.log(`Chunk ${i} for ${input.name}:`, chunk);
        console.log(`Chunk ${i} valid hex:`, /^[0-9a-fA-F]+$/.test(chunk));

        if (chunk.length === 64) {
          try {
            const decodedParam = decodeEventParameter(input.type, chunk, rawDataHex, startPos, input.name);
            decodedParam.name = input.name || `param_${i}`;
            decodedParam.indexed = false;
            decodedParameters.push(decodedParam);
            console.log(`Decoded non-indexed parameter ${input.name}:`, decodedParam);
          } catch (e) {
            console.error(`Error decoding non-indexed parameter ${input.name}:`, e);
            decodedParameters.push({
              name: input.name || `param_${i}`,
              type: input.type,
              value: 'Decoding error',
              formattedValue: 'Failed to decode',
              additionalInfo: 'Error occurred during decoding',
              raw: '0x' + chunk,
              indexed: false
            });
          }
        }
      }
    }

    console.log('Final decoded parameters:', decodedParameters);

    return {
      eventName,
      eventSignature: eventSignature || '',
      parameters: decodedParameters,
      rawData: rawData || ''
    };
  };

  const decodeEventData = async () => {
    if (!eventName || !topics || !rawData) {
      setDecodedData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const decoded = decodeEventWithABI();
      if (decoded) {
        setDecodedData(decoded);
        console.log('useDecodeEventData: Successfully decoded event:', decoded);
      } else {
        setDecodedData(null);
        setError('Could not decode event data');
      }
    } catch (err) {
      console.error('useDecodeEventData: Error decoding event:', err);
      setError(err instanceof Error ? err.message : 'Failed to decode event data');
      setDecodedData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!abiLoading && eventName && topics && rawData) {
      decodeEventData();
    }
  }, [eventName, topics, rawData, abi, abiLoading]);

  return {
    decodedData,
    loading: loading || abiLoading,
    error,
    refetch: decodeEventData
  };
};
