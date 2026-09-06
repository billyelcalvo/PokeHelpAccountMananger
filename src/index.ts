import Express from 'express';

const app = Express();
const port = 3000;

app.use(Express.json());

app.listen(port, () =>{
    `Server listening on port ${port}`;
})