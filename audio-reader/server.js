const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4'
};

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './web/audio-player.html';
  }
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  // 音声/動画ファイルの場合はRange Requestsをサポート
  if (extname === '.mp3' || extname === '.wav' || extname === '.mp4') {
    fs.stat(filePath, (error, stat) => {
      if (error) {
        if (error.code === 'ENOENT') {
          console.log(`[404] ${req.method} ${req.url} - File not found: ${filePath}`);
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(`<h1>404 Not Found</h1><p>${req.url}</p>`, 'utf-8');
        } else {
          console.log(`[500] ${req.method} ${req.url} - Error: ${error.code}`);
          res.writeHead(500);
          res.end(`Server Error: ${error.code}`, 'utf-8');
        }
        return;
      }
      
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        
        console.log(`[206] ${req.method} ${req.url} - Range: ${start}-${end}/${fileSize}`);
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType
        });
        file.pipe(res);
      } else {
        console.log(`[200] ${req.method} ${req.url} - Full file: ${fileSize} bytes`);
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes'
        });
        fs.createReadStream(filePath).pipe(res);
      }
    });
  } else {
    // その他のファイルは通常の読み込み
    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          console.log(`[404] ${req.method} ${req.url} - File not found: ${filePath}`);
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(`<h1>404 Not Found</h1><p>${req.url}</p>`, 'utf-8');
        } else {
          console.log(`[500] ${req.method} ${req.url} - Error: ${error.code}`);
          res.writeHead(500);
          res.end(`Server Error: ${error.code}`, 'utf-8');
        }
      } else {
        console.log(`[200] ${req.method} ${req.url} - ${contentType}`);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
