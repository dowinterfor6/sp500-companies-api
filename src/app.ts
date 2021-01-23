import express, { Request, Response } from "express";
import axios from "axios";
import redis from "redis";
import { promisify } from "util";
import { HTMLElement, parse } from "node-html-parser";
import { WikiApiParams, WikiParseResponse } from "./interfaces";

const app = express();
const redisClient = redis.createClient();

const hmsetAsync = promisify(redisClient.hmset).bind(redisClient);
const hmgetAsync = promisify(redisClient.hmget).bind(redisClient);
const flushDbAsync = promisify(redisClient.flushdb).bind(redisClient);

const SP_500_REDIS_KEY: string = "sp500";
const SP_500_OLD_REDIS_KEY: string = "sp500Old";
const DATE_ADDED: string = "dateAdded";
const TICKER_SYMBOLS: string = "tickerSymbols";

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
  try {
    const { data } = await axios.get<WikiParseResponse>(url, {
      params,
    });

    const rawHtml = data.parse.text;
    const root = parse(rawHtml);

    const sp500Table: HTMLElement =
      root.querySelector("#constituents") || root.querySelector("table");

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
  } catch (error) {
    console.log(`Error fetching from wiki page: ${error}`);
    return [];
  }
};

const setupRedisCache = async () => {
  try {
    await flushDbAsync();

    const wikiData = await fetchFromWiki();
    if (wikiData.length === 0) return;

    await hmsetAsync(
      SP_500_REDIS_KEY,
      DATE_ADDED,
      Date.now(),
      TICKER_SYMBOLS,
      wikiData.toString()
    );
    await hmsetAsync(
      SP_500_OLD_REDIS_KEY,
      DATE_ADDED,
      Date.now(),
      TICKER_SYMBOLS,
      wikiData.toString()
    );
  } catch (error) {
    console.log(`Error setting up redis cache: ${error}`);
  }
};

setupRedisCache();

app.get("/", async (req: Request, res: Response) => {
  try {
    const cachedData: string[] = await hmgetAsync(
      SP_500_REDIS_KEY,
      DATE_ADDED,
      TICKER_SYMBOLS
    );

    if (cachedData.some((el) => !el)) {
      throw new Error("Redis cache was set up incorrectly");
    }

    const formattedData = {
      dateAdded: cachedData[0],
      tickerSymbols: cachedData[1].split(","),
    };
    res.status(200).json(formattedData);
  } catch (error) {
    console.log(`Error in getting cached data: ${error}`);
    const errorData = {
      error,
    };
    res.status(500).json(errorData);
  }
});

export default app;
