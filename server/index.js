const express = require('express')
const path =require('path')
const app = express()
const ConfigParser = require('configparser');

const config=new ConfigParser();
config.read('config.ini')

const port = config.get('WEBSERVER','port')
app.use('/', express.static(path.join(__dirname, config.get('WEBSERVER','static'))))

app.get('/', (request, response) => {
  response.sendFile(__dirname+"/"+config.get('WEBSERVER','index'));
})

app.listen(port, () => {
  console.log(`webserver port ${port}`)
  console.log(config)
}) 