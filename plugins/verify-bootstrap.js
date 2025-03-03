const fs = require('fs');
const path = require('path');

class VerifyBootstrapPlugin {
  constructor(serverless) {
    this.serverless = serverless;
    this.hooks = {
      'before:package:createDeploymentArtifacts': this.verifyBootstrap.bind(this),
      'before:deploy:function:packageFunction': this.verifyBootstrap.bind(this),
    };
  }

  verifyBootstrap() {
    const bootstrapPath = path.join(this.serverless.config.servicePath, 'bootstrap');
    
    if (!fs.existsSync(bootstrapPath)) {
      throw new Error(
        'Bootstrap file not found in root directory!\n' +
        'Please run "npm run setup" first to download and setup the LLRT bootstrap file.'
      );
    }
    
    // Verify it's executable
    try {
      const stats = fs.statSync(bootstrapPath);
      const isExecutable = !!(stats.mode & fs.constants.S_IXUSR);
      
      if (!isExecutable) {
        throw new Error(
          'Bootstrap file exists but is not executable!\n' +
          'Please run "chmod +x bootstrap" to make it executable.'
        );
      }
    } catch (error) {
      throw new Error(`Failed to check bootstrap file permissions: ${error.message}`);
    }
  }
}

module.exports = VerifyBootstrapPlugin; 