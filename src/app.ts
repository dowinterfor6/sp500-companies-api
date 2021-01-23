import express, { Request, Response } from "express";
import axios from "axios";
import redis from "redis";
import { promisify } from "util";
import { HTMLElement, parse } from "node-html-parser";
import { WikiApiParams, WikiParseResponse } from "./interfaces";

const app = express();
const redisClient = redis.createClient();

const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

const SP_500_REDIS_KEY: string = "sp500TickerSymbols";

const wikiPageTitle: string = "List_of_S&P_500_companies";
const url: string = "https://en.wikipedia.org/w/api.php";
const params: WikiApiParams = {
  action: "parse",
  format: "json",
  page: wikiPageTitle,
  prop: "text",
  formatversion: 2,
};

const fetchFromWiki = async (): Promise<string[]> => {
  const { data } = await axios.get<WikiParseResponse>(url, {
    params,
  });

  // TODO: More robust error handling
  const rawHtml = data.parse?.text;
  const root = parse(rawHtml);

  const sp500Table: HTMLElement =
    root.querySelector("#constituents") || root.querySelector("table");

  if (!sp500Table) {
    throw new Error("Error in retrieving table from parsed wiki html");
  }

  const sp500Root = parse(sp500Table.toString());

  const sp500TableRows: HTMLElement[] = sp500Root.querySelectorAll("tr");

  const sp500TickerSymbols: string[] = [];

  sp500TableRows.forEach((row: HTMLElement, index: number) => {
    if (index > 0) {
      // TODO: More elegant solution? row.firstChild gives empty
      sp500TickerSymbols.push(row.childNodes[1].innerText.replace("\n", ""));
    }
  });

  return sp500TickerSymbols;
};

app.get("/", async (req: Request, res: Response) => {
  try {
    // TODO: Handle rejection
    // const redisRes: string | string[] = await getAsync(SP_500_REDIS_KEY);
    // TODO: Use set to prevent overlap data?
    redisClient.LRANGE(SP_500_REDIS_KEY, 0, -1, async (err, reply) => {
      console.log(reply);
      const redisRes = reply;

      let sp500TickerSymbols: string[];

      // TODO: if key doesn't exist or expired
      if (reply.length === 0) {
        sp500TickerSymbols = await fetchFromWiki();
        // EX is in seconds
        await redisClient.rpush(SP_500_REDIS_KEY, ...sp500TickerSymbols);
      } else {
        sp500TickerSymbols = redisRes;
      }

      res.status(200).send(sp500TickerSymbols);
    });

    // let sp500TickerSymbols: string[];

    // // TODO: if key doesn't exist or expired
    // if (!Array.isArray(redisRes)) {
    //   sp500TickerSymbols = await fetchFromWiki();
    //   // EX is in seconds
    //   await redisClient.rpush(SP_500_REDIS_KEY, ...sp500TickerSymbols);
    // } else {
    //   sp500TickerSymbols = redisRes;
    // }

    // res.status(200).send(sp500TickerSymbols);
  } catch (error) {
    console.log("Error: ", error);
    res.status(500);
  }
});

export default app;
