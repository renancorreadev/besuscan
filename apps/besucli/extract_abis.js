const fs = require('fs');
const path = require('path');

// Lista dos contratos
const contracts = [
    'AABankManager',
    'AABankAccount', 
    'KYCAMLValidator',
    'TransactionLimits',
    'MultiSignatureValidator',
    'SocialRecovery',
    'AuditLogger'
];

const jsonDir = '/root/eth/explorer/apps/besucli/templates/smart-contracts/AA/AAManagment/out';
const outputDir = '/root/eth/explorer/apps/besucli/templates/abis';

function extractContract(contractName) {
    const jsonFile = path.join(jsonDir, `${contractName}.sol`, `${contractName}.json`);
    
    try {
        const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        
        // Extrair ABI
        const abi = data.abi || [];
        const abiStr = JSON.stringify(abi, null, 0);
        
        // Extrair bytecode
        const bytecode = data.bytecode?.object || '';
        
        // Salvar arquivo .abi
        const abiFile = path.join(outputDir, `${contractName}.abi`);
        fs.writeFileSync(abiFile, abiStr);
        
        // Salvar arquivo .bin
        const binFile = path.join(outputDir, `${contractName}.bin`);
        fs.writeFileSync(binFile, bytecode);
        
        console.log(`✓ ${contractName}: ABI e bytecode extraídos`);
        console.log(`  - ABI: ${abi.length} itens`);
        console.log(`  - Bytecode: ${bytecode.length} caracteres`);
        
    } catch (error) {
        console.log(`✗ Erro ao processar ${contractName}: ${error.message}`);
    }
}

console.log('Extraindo ABIs e bytecodes dos contratos...');
console.log('='.repeat(50));

contracts.forEach(extractContract);

console.log('='.repeat(50));
console.log('Processamento concluído!');
