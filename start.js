#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (!fs.existsSync(envPath)) {
    log('❌ No se encontró el archivo .env', 'red');
    if (fs.existsSync(envExamplePath)) {
      log('💡 Por favor, copia .env.example a .env y configura las variables:', 'yellow');
      log('   cp .env.example .env', 'cyan');
    }
    process.exit(1);
  }
  
  log('✅ Archivo .env encontrado', 'green');
}

function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    log(`❌ Node.js ${nodeVersion} no es compatible. Se requiere Node.js 18 o superior.`, 'red');
    process.exit(1);
  }
  
  log(`✅ Node.js ${nodeVersion} es compatible`, 'green');
}

function checkDependencies() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    log('❌ No se encontraron las dependencias instaladas', 'red');
    log('💡 Ejecuta: npm install', 'yellow');
    process.exit(1);
  }
  
  log('✅ Dependencias instaladas', 'green');
}

function startServices() {
  log('🚀 Iniciando microservicios de TutorMatch...', 'blue');
  
  const services = [
    { name: 'API Gateway', port: 3000, command: 'npm run start:dev:gateway' },
    { name: 'User Service', port: 3001, command: 'npm run start:dev:user' },
    { name: 'Classroom Service', port: 3002, command: 'npm run start:dev:classroom' },
    { name: 'Chat Service', port: 3003, command: 'npm run start:dev:chat' }
  ];
  
  log('📋 Servicios a iniciar:', 'magenta');
  services.forEach(service => {
    log(`   • ${service.name} - Puerto ${service.port}`, 'cyan');
  });
  
  log('🔧 Iniciando todos los servicios...', 'yellow');
  
  const child = spawn('npm', ['run', 'start:dev:all'], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    log(`❌ Error al iniciar servicios: ${error.message}`, 'red');
    process.exit(1);
  });
  
  process.on('SIGINT', () => {
    log('\\n🛑 Deteniendo servicios...', 'yellow');
    child.kill('SIGINT');
    process.exit(0);
  });
}

function main() {
  log('🔍 Verificando prerrequisitos...', 'blue');
  
  checkNodeVersion();
  checkEnvFile();
  checkDependencies();
  
  log('✅ Todos los prerrequisitos cumplidos', 'green');
  log('', 'reset');
  
  startServices();
}

if (require.main === module) {
  main();
}
