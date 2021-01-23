import app from "./app";

const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`Server is listening to port ${port}`);
});

export default server;
