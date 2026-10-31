import app from "./app.js";

const server = app.listen(process.env.PORT || 3001, () => {
  console.log(`Backend running on port ${server.address().port}`);
});

export default server;
