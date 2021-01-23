import express, { Request, Response } from "express";
import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";
import { WikiApiParams, WikiParseResponse } from "./interfaces";

const wikiPageTitle: string = "List_of_S&P_500_companies";

const url: string = "https://en.wikipedia.org/w/api.php";

const params: WikiApiParams = {
  action: "parse",
  format: "json",
  page: wikiPageTitle,
  prop: "text",
  formatversion: 2,
};

const app = express();

app.get("/test", async (req: Request, res: Response) => {
  try {
    const response = await axios.get<WikiParseResponse>(url, {
      params,
    });

    const { data } = response;

    const rawHtml = data.parse?.text;

    const root = parse(rawHtml);

    const sp500Table: HTMLElement | null =
      root.querySelector("#constituents") || root.querySelector("table");

    if (!sp500Table) {
      throw new Error("Error in retrieving table from parsed wiki html");
    }

    const sp500Root = parse(sp500Table.toString());

    const sp500TableBody: HTMLElement | null = sp500Root.querySelector("tbody");

    const sp500BodyRoot = parse(sp500TableBody.toString());

    const sp500DataRows: HTMLElement[] | [] = sp500BodyRoot.querySelectorAll(
      "td"
    );

    sp500DataRows.forEach((dataRow) => {
      console.log(dataRow.firstChild);
    });

    res.status(200).send(sp500TableBody.toString());
  } catch (error) {
    console.log("Error: ", error);
    res.status(500);
  }
});

export default app;
