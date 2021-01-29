import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import axios, { AxiosResponse } from "axios";
import redis from "redis";
import { promisify } from "util";
import { HTMLElement, parse } from "node-html-parser";
import { WikiApiParams, WikiParseResponse } from "./interfaces";
import { alphaVantageKey, twelveDataKey } from "./config/keys";

const app = express();
const redisClient = redis.createClient();

const hmsetAsync = promisify(redisClient.hmset).bind(redisClient);
const hmgetAsync = promisify(redisClient.hmget).bind(redisClient);
const flushDbAsync = promisify(redisClient.flushdb).bind(redisClient);

const SP_500_REDIS_KEY: string = "sp500";
const COMPANY_INFO_SUFFIX: string = "info";
const COMPANY_TIME_SERIES_SUFFIX: string = "timeSeries";
const DATE_ADDED: string = "dateAdded";
const TICKER_SYMBOLS: string = "tickerSymbols";
const DAY_IN_MS: number = 1000 * 60 * 60 * 24;

const wikiPageTitle: string = "List_of_S&P_500_companies";
const wikiApiUrl: string = "https://en.wikipedia.org/w/api.php";
const params: WikiApiParams = {
  action: "parse",
  format: "json",
  page: wikiPageTitle,
  prop: "text",
  formatversion: 2,
};

const limiter = rateLimit({
  windowMs: 1000,
  max: 1,
});

app.use(limiter);

const fetchFromWiki = async (): Promise<string[]> => {
  try {
    const { data } = await axios.get<WikiParseResponse>(wikiApiUrl, {
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

    // TODO: Could validate against exchanges call from twelve data?
    return getUniqueTickerSymbols(sp500TickerSymbols);
  } catch (error) {
    console.log(`Error fetching from wiki page: ${error}`);
    return [];
  }
};

const setupRedisCache = async () => {
  try {
    await flushDbAsync();
    await updateRedisCache();
  } catch (error) {
    console.log(`Error setting up redis cache: ${error}`);
  }
};

const getUniqueTickerSymbols = (tickerSymbols: string[]): string[] => {
  const tickerSet = new Set<string>(tickerSymbols);
  return [...tickerSet];
};

const updateRedisCache = async () => {
  try {
    const wikiData = await fetchFromWiki();
    if (wikiData.length === 0) {
      console.log("Fetched empty data from wiki page");
      throw new Error("Wiki fetch returned no results");
    }

    const currDate = new Date();

    await hmsetAsync(
      SP_500_REDIS_KEY,
      DATE_ADDED,
      currDate,
      TICKER_SYMBOLS,
      wikiData.toString()
    );
    console.log(`Successful redis cache update on ${currDate.toDateString()}`);
  } catch (error) {
    console.log(`Error updating redis cache: ${error}`);
  }
};

setupRedisCache().then(() => {
  updateCompanyTimeSeries();
  updateCompanyInfo();
});

// TODO: Make a set interval to call update time series and info
// Info is updated quarterly, time series updated nightly

setInterval(() => {
  const currDate = new Date();
  if (currDate.getDay() === 0) {
    updateRedisCache();
  }
}, DAY_IN_MS);

// Wiki api
app.get("/sp500-companies", async (req: Request, res: Response) => {
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
      error: error.message,
    };
    res.status(500).json(errorData);
  }
});

// Alpha Vantage api
// 500/day, 5/min
// OVERVIEW, INCOME_STATEMENT, BALANCE_SHEET
const alphaVantageApiUrl: string = "https://www.alphavantage.co/query";
const alphaVantageFunctions: string[] = [
  "OVERVIEW",
  "INCOME_STATEMENT",
  "BALANCE_SHEET",
];

const updateCompanyInfo = async () => {
  console.log("Attempt company info update");
  try {
    const cachedData: string[] = await hmgetAsync(
      SP_500_REDIS_KEY,
      DATE_ADDED,
      TICKER_SYMBOLS
    );

    if (cachedData.some((el) => !el)) {
      throw new Error("Redis cache was set up incorrectly");
    }

    const tickerSymbols = cachedData[1].split(",");
    const intervalDelay =
      (Math.ceil(((24 * 60) / (tickerSymbols.length / 3)) * 10) * 60 * 1000) /
      10;

    const companyInfoUpdateInterval = setInterval(async () => {
      try {
        if (tickerSymbols.length === 0) {
          clearInterval(companyInfoUpdateInterval);
          return;
        }
        const currSymbol = tickerSymbols.shift();
        alphaVantageFunctions.forEach(async (aVFunction) => {
          // await get for each AV function (3 overall)
          // put into redis cache
          const params = {
            function: aVFunction,
            symbol: currSymbol,
            apikey: alphaVantageKey
          }

          // TODO: how to efficiently store json in redis
          // construct a new one for all 3 combined? 

          // TODO: Is this worth typing...
          // const { data } = await axios.get(alphaVantageApiUrl, {
          //   params
          // })
        });
      } catch (error) {
        console.log(`Error in updating company info interval: ${error}`);
      }
    }, intervalDelay);
  } catch (error) {
    console.log(`Error in getting cached data: ${error}`);
  }
};

// Twelve Data api
// 800/day, 12/min
const twelveDataApiUrl = "https://api.twelvedata.com/time_series";

const updateCompanyTimeSeries = async () => {
  console.log("Attempt company time series update");
  try {
    const cachedData: string[] = await hmgetAsync(
      SP_500_REDIS_KEY,
      DATE_ADDED,
      TICKER_SYMBOLS
    );

    if (cachedData.some((el) => !el)) {
      throw new Error("Redis cache was set up incorrectly");
    }

    const tickerSymbols = cachedData[1].split(",");
    // Add extra buffer
    const intervalDelay = Math.ceil((60000 + 1000) / 12);

    const companyTimeSeriesUpdateInterval = setInterval(async () => {
      try {
        if (tickerSymbols.length === 0) {
          clearInterval(companyTimeSeriesUpdateInterval);
          return;
        }
        const currSymbol = tickerSymbols.shift();
        // await get for company time series
        // put into redis cache
      } catch (error) {
        console.log(`Error in updating company time series interval: ${error}`);
      }
    }, intervalDelay);
  } catch (error) {
    console.log(`Error in getting cached data: ${error}`);
  }
};

// TODO: Make the actual endpoints lmao

export default app;
