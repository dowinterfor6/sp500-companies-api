import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
// TODO: HERE do i need this?
// import * as bodyParser from 'body-parser';

const wikiPageTitle: string = "List_of_S&P_500_companies";

const url = "https://en.wikipedia.org/w/api.php";

const params: any = {
  action: "parse",
  format: "json",
  page: wikiPageTitle,
  prop: "text",
  formatversion: 2,
};

const app = express();

app.get("/", async (req, res) => {
  console.log("get");
  try {
    const { data } = await axios.get(url, {
      params,
    });
    console.log(data);
    res.status(200).send(data);
  } catch (error) {
    console.log("Error: ", error);
    res.status(500);
  }
});

export default app;
