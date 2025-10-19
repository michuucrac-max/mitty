// 🌐 server.js — Mantiene el bot activo en Render
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('🌐 KeepAlive activo — Softti Tales está despierta UwU');
});

function keepAlive() {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🌐 KeepAlive activo en puerto ${PORT}`);
  });
}

export default keepAlive;
