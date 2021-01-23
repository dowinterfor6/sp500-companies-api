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

app.get("/", async (req: Request, res: Response) => {
  try {
    const response = await axios.get<WikiParseResponse>(url, {
      params,
    });

    const { data } = response;

    const rawHtml = data.parse?.text;

    const root = parse(rawHtml);

    const sp500Table: HTMLElement =
      root.querySelector("#constituents") || root.querySelector("table");

    // TODO: More robust error handling
    if (!sp500Table) {
      throw new Error("Error in retrieving table from parsed wiki html");
    }

    const sp500Root = parse(sp500Table.toString());

    const sp500TableRows: Array<HTMLElement> = sp500Root.querySelectorAll("tr");

    const sp500TickerSymbols: Array<string> = [];

    sp500TableRows.forEach((row: HTMLElement, index: number) => {
      if (index > 0) {
        // TODO: More elegant solution? row.firstChild gives empty
        sp500TickerSymbols.push(row.childNodes[1].innerText);
      }
    });

    res.status(200).send(sp500TickerSymbols);
  } catch (error) {
    console.log("Error: ", error);
    res.status(500);
  }
});

export default app;
