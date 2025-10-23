const express = require('express')
const path = require('path')
const fs = require('fs')
const net = require('net')
const app = express()
const ConfigParser = require('configparser');

app.use(express.json())

const config=new ConfigParser();
config.read('config.ini')

const port = config.get('WEBSERVER','port')
app.use('/', express.static(path.join(__dirname, config.get('WEBSERVER','static'))))

const LASER_IP = '192.168.1.236';
const LASER_PORT = 12345;

function sendLaserCommand(command) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.connect(LASER_PORT, LASER_IP, () => {
      console.log(`Connected to laser: ${LASER_IP}:${LASER_PORT}`);
      client.write(command);
    });
    
    client.on('data', (data) => {
      console.log(`Laser response: ${data}`);
      client.destroy();
      resolve(data.toString());
    });
    
    client.on('error', (err) => {
      console.error(`Laser connection error: ${err}`);
      client.destroy();
      reject(err);
    });
    
    client.on('close', () => {
      console.log('Laser connection closed');
    });
    
    setTimeout(() => {
      client.destroy();
      reject(new Error('Laser connection timeout'));
    }, 10000);
  });
}

function sendFileToLaser(filePath) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.connect(LASER_PORT, LASER_IP, () => {
      console.log(`Connected to laser for file transfer: ${LASER_IP}:${LASER_PORT}`);
      client.write('SEND_CONFIG');
    });
    
    client.on('data', (data) => {
      const response = data.toString();
      
      if (response === 'READY') {
        console.log('Reading file:', filePath);
        fs.readFile(filePath, (err, fileData) => {
          if (err) {
            console.error('Error reading file:', err);
            client.destroy();
            reject(err);
            return;
          }
          
          console.log(`File read successfully, size: ${fileData.length} bytes`);
          const lengthBuffer = Buffer.alloc(4);
          lengthBuffer.writeUInt32BE(fileData.length, 0);
          const fullData = Buffer.concat([lengthBuffer, fileData]);
          console.log(`Sending file data, total size: ${fullData.length} bytes`);
          client.write(fullData);
        });
      } else {
        console.log(`Laser file transfer response: ${response}`);
        client.destroy();
        resolve(response);
      }
    });
    
    client.on('error', (err) => {
      console.error(`Laser file transfer error: ${err}`);
      client.destroy();
      reject(err);
    });
    
    client.on('close', () => {
      console.log('Laser file transfer connection closed');
    });
    
    setTimeout(() => {
      client.destroy();
      reject(new Error('Laser file transfer timeout'));
    }, 30000);
  });
}

// UCS IP configuration (separate from Laser)
const UCS_IP = '192.168.1.237';
const UCS_PORT = 12345;

// Send command to UCS device
function sendUcsCommand(command) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.connect(UCS_PORT, UCS_IP, () => {
      console.log(`Connected to UCS: ${UCS_IP}:${UCS_PORT}`);
      client.write(command);
    });
    
    client.on('data', (data) => {
      console.log(`UCS response: ${data}`);
      client.destroy();
      resolve(data.toString());
    });
    
    client.on('error', (err) => {
      console.error(`UCS connection error: ${err}`);
      client.destroy();
      reject(err);
    });
    
    client.on('close', () => {
      console.log('UCS connection closed');
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      client.destroy();
      reject(new Error('UCS connection timeout'));
    }, 10000);
  });
}

// Send file to UCS device
function sendFileToUcs(filePath) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.connect(UCS_PORT, UCS_IP, () => {
      console.log(`Connected to UCS for file transfer: ${UCS_IP}:${UCS_PORT}`);
      client.write('SEND_CONFIG');
    });
    
    client.on('data', (data) => {
      const response = data.toString();
      
      if (response === 'READY') {
        // Read file and send
        console.log('Reading file for UCS:', filePath);
        fs.readFile(filePath, (err, fileData) => {
          if (err) {
            console.error('Error reading file for UCS:', err);
            client.destroy();
            reject(err);
            return;
          }
          
          console.log(`UCS file read successfully, size: ${fileData.length} bytes`);
          
          // Send file length + file data
          const lengthBuffer = Buffer.alloc(4);
          lengthBuffer.writeUInt32BE(fileData.length, 0);
          const fullData = Buffer.concat([lengthBuffer, fileData]);
          console.log(`Sending UCS file data, total size: ${fullData.length} bytes`);
          client.write(fullData);
        });
      } else {
        console.log(`UCS file transfer response: ${response}`);
        client.destroy();
        resolve(response);
      }
    });
    
    client.on('error', (err) => {
      console.error(`UCS file transfer error: ${err}`);
      client.destroy();
      reject(err);
    });
    
    client.on('close', () => {
      console.log('UCS file transfer connection closed');
    });
    
    // Timeout after 30 seconds for file transfer
    setTimeout(() => {
      client.destroy();
      reject(new Error('UCS file transfer timeout'));
    }, 30000);
  });
}

// Update UCS config file (separate from LSS)
function updateUcsConfig(configData) {
  const ucsConfigPath = 'ucs_config.txt';
  const ucsConfig = new ConfigParser();
  
  try {
    // Read current UCS config (create if doesn't exist)
    console.log('Reading UCS config from:', ucsConfigPath);
    if (fs.existsSync(ucsConfigPath)) {
      ucsConfig.read(ucsConfigPath);
    } else {
      // Create default UCS config if it doesn't exist
      console.log('Creating default UCS config file');
      const defaultConfig = fs.readFileSync('config.txt', 'utf8');
      fs.writeFileSync(ucsConfigPath, defaultConfig);
      ucsConfig.read(ucsConfigPath);
    }
    
    // Update ISP adjustment values
    if (configData.adjustment) {
      console.log('Updating UCS adjustment values:', configData.adjustment);
      ucsConfig.set('isp.0.adjustment', 'contrast', configData.adjustment.contrast.toString());
      ucsConfig.set('isp.0.adjustment', 'brightness', configData.adjustment.brightness.toString());
      ucsConfig.set('isp.0.adjustment', 'saturation', configData.adjustment.saturation.toString());
      ucsConfig.set('isp.0.adjustment', 'sharpness', configData.adjustment.sharpness.toString());
      ucsConfig.set('isp.0.adjustment', 'hue', configData.adjustment.hue.toString());
    }
    // Update white balance values
    if (configData.white_balance) {
      console.log('Updating UCS white balance values:', configData.white_balance);
      ucsConfig.set('isp.0.white_blance', 'white_blance_style', configData.white_balance.style);
      ucsConfig.set('isp.0.white_blance', 'white_blance_red', configData.white_balance.red.toString());
      ucsConfig.set('isp.0.white_blance', 'white_blance_green', configData.white_balance.green.toString());
      ucsConfig.set('isp.0.white_blance', 'white_blance_blue', configData.white_balance.blue.toString());
    }
    // Update rotation (video.source)
    if (configData.rotation !== undefined) {
      console.log('Updating UCS rotation:', configData.rotation);
      ucsConfig.set('video.source', 'rotation', configData.rotation.toString());
    }
    // Update logo toggle (osd.6)
    if (configData.logo_enabled !== undefined) {
      console.log('Updating UCS logo (osd.6 enabled):', configData.logo_enabled);
      ucsConfig.set('osd.6', 'enabled', configData.logo_enabled ? '1' : '0');
    }
    
    // Write updated UCS config
    console.log('Writing updated UCS config to:', ucsConfigPath);
    ucsConfig.write(ucsConfigPath);
    console.log('UCS config file updated successfully');
    
    return true;
  } catch (error) {
    console.error('Error updating UCS config.txt:', error);
    return false;
  }
}

// Get current UCS ISP configuration
function getCurrentUcsConfig() {
  const ucsConfigPath = 'ucs_config.txt';
  const ucsConfig = new ConfigParser();
  
  try {
    if (!fs.existsSync(ucsConfigPath)) {
      // If UCS config doesn't exist, create it from the main config
      const defaultConfig = fs.readFileSync('config.txt', 'utf8');
      fs.writeFileSync(ucsConfigPath, defaultConfig);
    }
    
    ucsConfig.read(ucsConfigPath);
    
    return {
      adjustment: {
        contrast: parseInt(ucsConfig.get('isp.0.adjustment', 'contrast') || '50'),
        brightness: parseInt(ucsConfig.get('isp.0.adjustment', 'brightness') || '50'),
        saturation: parseInt(ucsConfig.get('isp.0.adjustment', 'saturation') || '50'),
        sharpness: parseInt(ucsConfig.get('isp.0.adjustment', 'sharpness') || '50'),
        hue: parseInt(ucsConfig.get('isp.0.adjustment', 'hue') || '50')
      },
      white_balance: {
        style: ucsConfig.get('isp.0.white_blance', 'white_blance_style') || 'autoWhiteBalance',
        red: parseInt(ucsConfig.get('isp.0.white_blance', 'white_blance_red') || '50'),
        green: parseInt(ucsConfig.get('isp.0.white_blance', 'white_blance_green') || '50'),
        blue: parseInt(ucsConfig.get('isp.0.white_blance', 'white_blance_blue') || '50')
      },
      rotation: parseInt(ucsConfig.get('video.source', 'rotation') || '0'),
      logo_enabled: ucsConfig.get('osd.6', 'enabled') === '1'
    };
  } catch (error) {
    console.error('Error reading UCS config.txt:', error);
    return null;
  }
}

// Update LSS config.txt file (original function)
function updateRkipcConfig(configData) {
  const rkipcPath = 'config.txt';
  const rkipcConfig = new ConfigParser();
  
  try {
    console.log('Reading config from:', rkipcPath);
    rkipcConfig.read(rkipcPath);
    
    // Update ISP adjustment values
    if (configData.adjustment) {
      console.log('Updating adjustment values:', configData.adjustment);
      rkipcConfig.set('isp.0.adjustment', 'contrast', configData.adjustment.contrast.toString());
      rkipcConfig.set('isp.0.adjustment', 'brightness', configData.adjustment.brightness.toString());
      rkipcConfig.set('isp.0.adjustment', 'saturation', configData.adjustment.saturation.toString());
      rkipcConfig.set('isp.0.adjustment', 'sharpness', configData.adjustment.sharpness.toString());
      rkipcConfig.set('isp.0.adjustment', 'hue', configData.adjustment.hue.toString());
    }
    // Update white balance values
    if (configData.white_balance) {
      console.log('Updating white balance values:', configData.white_balance);
      rkipcConfig.set('isp.0.white_blance', 'white_blance_style', configData.white_balance.style);
      rkipcConfig.set('isp.0.white_blance', 'white_blance_red', configData.white_balance.red.toString());
      rkipcConfig.set('isp.0.white_blance', 'white_blance_green', configData.white_balance.green.toString());
      rkipcConfig.set('isp.0.white_blance', 'white_blance_blue', configData.white_balance.blue.toString());
    }
    // Update rotation (video.source)
    if (configData.rotation !== undefined) {
      console.log('Updating LSS rotation:', configData.rotation);
      rkipcConfig.set('video.source', 'rotation', configData.rotation.toString());
    }
    // Update logo toggle (osd.6)
    if (configData.logo_enabled !== undefined) {
      console.log('Updating LSS logo (osd.6 enabled):', configData.logo_enabled);
      rkipcConfig.set('osd.6', 'enabled', configData.logo_enabled ? '1' : '0');
    }
    // Write updated config
    console.log('Writing updated config to:', rkipcPath);
    rkipcConfig.write(rkipcPath);
    console.log('Config file updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating config.txt:', error);
    return false;
  }
}

function getCurrentIspConfig() {
  const rkipcPath = 'config.txt';
  const rkipcConfig = new ConfigParser();
  
  try {
    rkipcConfig.read(rkipcPath);
    
    return {
      adjustment: {
        contrast: parseInt(rkipcConfig.get('isp.0.adjustment', 'contrast') || '50'),
        brightness: parseInt(rkipcConfig.get('isp.0.adjustment', 'brightness') || '50'),
        saturation: parseInt(rkipcConfig.get('isp.0.adjustment', 'saturation') || '50'),
        sharpness: parseInt(rkipcConfig.get('isp.0.adjustment', 'sharpness') || '50'),
        hue: parseInt(rkipcConfig.get('isp.0.adjustment', 'hue') || '50')
      },
      white_balance: {
        style: rkipcConfig.get('isp.0.white_blance', 'white_blance_style') || 'autoWhiteBalance',
        red: parseInt(rkipcConfig.get('isp.0.white_blance', 'white_blance_red') || '50'),
        green: parseInt(rkipcConfig.get('isp.0.white_blance', 'white_blance_green') || '50'),
        blue: parseInt(rkipcConfig.get('isp.0.white_blance', 'white_blance_blue') || '50')
      },
      rotation: parseInt(rkipcConfig.get('video.source', 'rotation') || '0'),
      logo_enabled: rkipcConfig.get('osd.6', 'enabled') === '1'
    };
  } catch (error) {
    console.error('Error reading config.txt:', error);
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ispDebounceTimers = {};
const ispPendingUpdates = {};
const DEBOUNCE_DELAY = 300; // 300ms delay - reduced for better responsiveness

// UCS Debouncing mechanism (separate from ISP)
const ucsDebounceTimers = {};
const ucsPendingUpdates = {};
const UCS_DEBOUNCE_DELAY = 300; // Same delay as ISP for consistency

function debounceIspUpdate(parameter, value) {
  return new Promise((resolve, reject) => {
    if (ispPendingUpdates[parameter]) {
      ispPendingUpdates[parameter].reject(new Error('Superseded by newer request'));
    }
    
    ispPendingUpdates[parameter] = { value, resolve, reject };
    
    if (ispDebounceTimers[parameter]) {
      clearTimeout(ispDebounceTimers[parameter]);
    }
    
    ispDebounceTimers[parameter] = setTimeout(async () => {
      const pending = ispPendingUpdates[parameter];
      if (pending) {
        try {
          console.log(`Executing debounced ISP update: ${parameter} = ${pending.value}`);
          const command = `SET_${parameter.toUpperCase()}:${pending.value}`;
          const response = await sendLaserCommand(command);
          
          pending.resolve({
            success: true,
            parameter: parameter,
            value: pending.value,
            response: response.trim(),
            debounced: true
          });
          
        } catch (error) {
          pending.reject(error);
        } finally {
          delete ispPendingUpdates[parameter];
          delete ispDebounceTimers[parameter];
        }
      }
    }, DEBOUNCE_DELAY);
  });
}

// UCS Debouncing function (separate from ISP)
function debounceUcsUpdate(parameter, value) {
  return new Promise((resolve, reject) => {
    // If there's a pending update for this parameter, reject the old one
    if (ucsPendingUpdates[parameter]) {
      ucsPendingUpdates[parameter].reject(new Error('Superseded by newer request'));
    }
    
    // Store the new pending update
    ucsPendingUpdates[parameter] = { value, resolve, reject };
    
    // Clear existing timer for this parameter
    if (ucsDebounceTimers[parameter]) {
      clearTimeout(ucsDebounceTimers[parameter]);
    }
    
    // Set new timer
    ucsDebounceTimers[parameter] = setTimeout(async () => {
      const pending = ucsPendingUpdates[parameter];
      if (pending) {
        try {
          console.log(`Executing debounced UCS update: ${parameter} = ${pending.value}`);
          const command = `SET_${parameter.toUpperCase()}:${pending.value}`;
          const response = await sendUcsCommand(command);
          
          pending.resolve({
            success: true,
            parameter: parameter,
            value: pending.value,
            response: response.trim(),
            debounced: true
          });
          
        } catch (error) {
          pending.reject(error);
        } finally {
          // Clean up
          delete ucsPendingUpdates[parameter];
          delete ucsDebounceTimers[parameter];
        }
      }
    }, UCS_DEBOUNCE_DELAY);
  });
}

app.post('/api/save-lss-config', async (req, res) => {
  try {
    const configData = req.body;
    
    if (!configData.adjustment || !configData.white_balance) {
      return res.status(400).json({ error: 'Invalid configuration data' });
    }
    
    console.log('Saving ISP configuration:', configData);
    
    const updateSuccess = updateRkipcConfig(configData);
    if (!updateSuccess) {
      return res.status(500).json({ error: 'Failed to update configuration file' });
    }
    
    const updatedConfig = getCurrentIspConfig();
    if (!updatedConfig) {
      return res.status(500).json({ error: 'Failed to verify configuration update' });
    }
    console.log('Configuration verified:', updatedConfig);
    
    console.log('Killing RKIPC service...');
    await sendLaserCommand('KILL_RKIPC');
    await delay(5000); 
    
    console.log('Sending configuration file...');
    const rkipcPath = 'config.txt';
    await sendFileToLaser(rkipcPath);
    await delay(5000); 
    
    console.log('Restarting RKIPC service...');
    await sendLaserCommand('RESTART_RKIPC');
    await delay(5000);  
    
    res.json({ success: true, message: 'Configuration saved and applied successfully' });
    
  } catch (error) {
    console.error('Error saving ISP configuration:', error);
    res.status(500).json({ error: 'Failed to save configuration: ' + error.message });
  }
});

app.post('/api/laser-control', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || (command !== 'ON' && command !== 'OFF')) {
      return res.status(400).json({ error: 'Invalid command. Use ON or OFF' });
    }
    
    console.log(`Controlling laser: ${command}`);
    
    const response = await sendLaserCommand(command);
    
    res.json({ 
      success: true, 
      message: `Laser ${command.toLowerCase()} command sent successfully`,
      response: response 
    });
    
  } catch (error) {
    console.error('Error controlling laser:', error);
    res.status(500).json({ error: 'Failed to control laser: ' + error.message });
  }
});

app.get('/api/isp-live/:parameter', async (req, res) => {
  try {
    const { parameter } = req.params;
    const validParameters = ['contrast', 'brightness', 'saturation', 'sharpness', 'hue', 'all'];
    
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({ error: 'Invalid parameter. Valid parameters: contrast, brightness, saturation, sharpness, hue, all' });
    }
    
    console.log(`Getting live ISP parameter: ${parameter}`);
    
    let command;
    if (parameter === 'all') {
      command = 'GET_ALL_ISP';
    } else {
      command = `GET_${parameter.toUpperCase()}`;
    }
    
    const response = await sendLaserCommand(command);
    
    let value;
    if (parameter === 'all') {
      value = response.trim();
    } else {
      const match = response.match(/:\s*(\d+)/);
      value = match ? parseInt(match[1]) : null;
    }
    
    res.json({ 
      success: true, 
      parameter: parameter,
      value: value,
      raw_response: response.trim()
    });
    
  } catch (error) {
    console.error(`Error getting ISP parameter ${req.params.parameter}:`, error);
    res.status(500).json({ error: 'Failed to get ISP parameter: ' + error.message });
  }
});

app.post('/api/isp-parameter', async (req, res) => {
  try {
    const { parameter, value, debounced = false } = req.body;
    const validParameters = ['contrast', 'brightness', 'saturation', 'sharpness', 'hue'];
    
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({ error: 'Invalid parameter. Valid parameters: contrast, brightness, saturation, sharpness, hue' });
    }
    
    if (typeof value !== 'number' || value < 0 || value > 255) {
      return res.status(400).json({ error: 'Value must be a number between 0 and 255' });
    }
    
    if (debounced) { 
      console.log(`Debouncing ISP parameter: ${parameter} = ${value}`);
      
      try {
        const result = await debounceIspUpdate(parameter, value);
        res.json(result);
      } catch (error) {
        console.error('Error in debounced ISP parameter update:', error);
        res.status(500).json({ error: 'Failed to set ISP parameter: ' + error.message });
      }
    } else {
      console.log(`Setting ISP parameter immediately: ${parameter} = ${value}`);
      
      const command = `SET_${parameter.toUpperCase()}:${value}`;
      const response = await sendLaserCommand(command);
      
      res.json({ 
        success: true, 
        message: `${parameter} set to ${value}`,
        parameter: parameter,
        value: value,
        response: response.trim(),
        debounced: false
      });
    }
    
  } catch (error) {
    console.error('Error setting ISP parameter:', error);
    res.status(500).json({ error: 'Failed to set ISP parameter: ' + error.message });
  }
});

app.post('/api/isp-parameter-debounced', async (req, res) => {
  try {
    const { parameter, value } = req.body;
    const validParameters = ['contrast', 'brightness', 'saturation', 'sharpness', 'hue'];
    
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({ error: 'Invalid parameter. Valid parameters: contrast, brightness, saturation, sharpness, hue' });
    }
    
    if (typeof value !== 'number' || value < 0 || value > 255) {
      return res.status(400).json({ error: 'Value must be a number between 0 and 255' });
    }
    
    console.log(`Queuing debounced ISP parameter: ${parameter} = ${value}`);
    
    try {
      const result = await debounceIspUpdate(parameter, value);
      res.json(result);
    } catch (error) {
      if (error.message && error.message.includes('Superseded by newer request')) {
        res.json({ 
          success: false, 
          message: 'Request superseded by newer request',
          superseded: true 
        });
      } else {
        console.error('Error in debounced ISP parameter update:', error);
        res.status(500).json({ error: 'Failed to set ISP parameter: ' + error.message });
      }
    }
    
  } catch (error) {
    console.error('Error in ISP parameter debounced endpoint:', error);
    res.status(500).json({ error: 'Failed to process ISP parameter: ' + error.message });
  }
});

app.post('/api/isp-parameters-batch', async (req, res) => {
  try {
    const { parameters } = req.body;
    
    if (!parameters || typeof parameters !== 'object') {
      return res.status(400).json({ error: 'Parameters object is required' });
    }
    
    const validParameters = ['contrast', 'brightness', 'saturation', 'sharpness', 'hue'];
    const results = [];
    
    console.log('Setting ISP parameters batch:', parameters);
    
    for (const [param, value] of Object.entries(parameters)) {
      if (!validParameters.includes(param)) {
        results.push({ parameter: param, success: false, error: 'Invalid parameter' });
        continue;
      }
      
      if (typeof value !== 'number' || value < 0 || value > 255) {
        results.push({ parameter: param, success: false, error: 'Invalid value range' });
        continue;
      }
      
      try {
        const command = `SET_${param.toUpperCase()}:${value}`;
        const response = await sendLaserCommand(command);
        results.push({ 
          parameter: param, 
          success: true, 
          value: value,
          response: response.trim()
        });
        
        await delay(100);
        
      } catch (error) {
        results.push({ 
          parameter: param, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Batch update completed',
      results: results
    });
    
  } catch (error) {
    console.error('Error in batch ISP parameter update:', error);
    res.status(500).json({ error: 'Failed to update ISP parameters: ' + error.message });
  }
});

// UCS Configuration API Routes

// Get current UCS configuration
app.get('/api/ucs-config', (req, res) => {
  const currentConfig = getCurrentUcsConfig();
  
  if (currentConfig) {
    res.json(currentConfig);
  } else {
    res.status(500).json({ error: 'Failed to read UCS configuration' });
  }
});

// Save UCS configuration
app.post('/api/save-ucs-config', async (req, res) => {
  try {
    const configData = req.body;
    
    if (!configData.adjustment || !configData.white_balance) {
      return res.status(400).json({ error: 'Invalid UCS configuration data' });
    }
    
    console.log('Saving UCS configuration:', configData);
    
    const updateSuccess = updateUcsConfig(configData);
    if (!updateSuccess) {
      return res.status(500).json({ error: 'Failed to update UCS configuration file' });
    }
    
    const updatedConfig = getCurrentUcsConfig();
    if (!updatedConfig) {
      return res.status(500).json({ error: 'Failed to verify UCS configuration update' });
    }
    console.log('UCS Configuration verified:', updatedConfig);
    
    console.log('Killing UCS RKIPC service...');
    await sendUcsCommand('KILL_RKIPC');
    await delay(5000); 
    
    console.log('Sending UCS configuration file...');
    const ucsConfigPath = 'ucs_config.txt';
    await sendFileToUcs(ucsConfigPath);
    await delay(5000); 
    
    console.log('Restarting UCS RKIPC service...');
    await sendUcsCommand('RESTART_RKIPC');
    await delay(5000);  
    
    res.json({ success: true, message: 'UCS Configuration saved and applied successfully' });
    
  } catch (error) {
    console.error('Error saving UCS configuration:', error);
    res.status(500).json({ error: 'Failed to save UCS configuration: ' + error.message });
  }
});

// UCS Set ISP parameter with debouncing support
app.post('/api/ucs-parameter-debounced', async (req, res) => {
  try {
    const { parameter, value } = req.body;
    const validParameters = ['contrast', 'brightness', 'saturation', 'sharpness', 'hue'];
    
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({ error: 'Invalid parameter. Valid parameters: contrast, brightness, saturation, sharpness, hue' });
    }
    
    if (typeof value !== 'number' || value < 0 || value > 255) {
      return res.status(400).json({ error: 'Value must be a number between 0 and 255' });
    }
    
    console.log(`Queuing debounced UCS parameter: ${parameter} = ${value}`);
    
    try {
      // This will either queue the update or replace an existing queued update
      const result = await debounceUcsUpdate(parameter, value);
      res.json(result);
    } catch (error) {
      // Don't log "Superseded" errors as they are expected behavior
      if (error.message && error.message.includes('Superseded by newer request')) {
        // Return a success response for superseded requests since they're not really errors
        res.json({ 
          success: false, 
          message: 'Request superseded by newer request',
          superseded: true 
        });
      } else {
        console.error('Error in debounced UCS parameter update:', error);
        res.status(500).json({ error: 'Failed to set UCS parameter: ' + error.message });
      }
    }
    
  } catch (error) {
    console.error('Error in UCS parameter debounced endpoint:', error);
    res.status(500).json({ error: 'Failed to process UCS parameter: ' + error.message });
  }
});

app.get('/', (request, response) => {
  response.sendFile(__dirname+"/"+config.get('WEBSERVER','index'));
})

app.get('/lss-config', (request, response) => {
  response.sendFile(path.join(__dirname, 'html/browser/lss-config.html'));
});

// Route for UCS configuration page
app.get('/ucs-config', (request, response) => {
  response.sendFile(path.join(__dirname, 'html/browser/ucs-config.html'));
});

app.listen(port, () => {
  console.log(`webserver port ${port}`)
  console.log(config)
}) 