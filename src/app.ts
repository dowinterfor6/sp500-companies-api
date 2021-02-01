import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import axios from "axios";
import cors from "cors";
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
const COMPANY_TIME_SERIES_SUFFIX: string = "time_series";
const LAST_UPDATED: string = "last_updated";
const TICKER_SYMBOLS: string = "ticker_symbols";
const DAY_IN_MS: number = 1000 * 60 * 60 * 24;

const wikiPageTitle: string = "List_of_S&P_500_companies";
const wikiApiUrl: string = "https://en.wikipedia.org/w/api.php";
const wikiParams: WikiApiParams = {
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
app.use(cors());

const fetchFromWiki = async (): Promise<string[]> => {
  try {
    const { data } = await axios.get<WikiParseResponse>(wikiApiUrl, {
      params: wikiParams,
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
        sp500TickerSymbols.push(row.childNodes[1].innerText.replace("\n", ""));
      }
    });

    return getUniqueTickerSymbols(sp500TickerSymbols);
  } catch (error) {
    console.log(`| API ERROR | Wiki API | ${error}`);
    return [];
  }
};

const setupRedisCache = async () => {
  try {
    await flushDbAsync();
    await updateRedisCache();
  } catch (error) {
    console.log(`| Redis ERROR | Redis initial setup | ${error}`);
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
      throw new Error("Wiki fetch returned no results");
    }

    const currDate = new Date();

    await hmsetAsync(
      SP_500_REDIS_KEY,
      LAST_UPDATED,
      currDate,
      TICKER_SYMBOLS,
      wikiData.toString()
    );
    console.log(
      `| Redis LOG | SP500 symbols update on ${currDate.toDateString()}`
    );
  } catch (error) {
    console.log(`| Redis ERROR | Updating Redis cache | ${error}`);
  }
};

setupRedisCache().then(() => {
  updateCompanyTimeSeries();
  updateCompanyInfo();
});

let prevMonth: number = new Date().getMonth();

setInterval(() => {
  const currDate = new Date();
  if (currDate.getDay() === 0) {
    updateRedisCache();
  }

  updateCompanyTimeSeries();

  const currMonth = currDate.getMonth();
  if (currMonth !== prevMonth) {
    prevMonth = currMonth;
    updateCompanyInfo();
  }
}, DAY_IN_MS);

const alphaVantageApiUrl: string = "https://www.alphavantage.co/query";
const alphaVantageFunctions: string[] = [
  "OVERVIEW",
  "INCOME_STATEMENT",
  "BALANCE_SHEET",
];

const updateCompanyInfo = async () => {
  try {
    const cachedData: string[] = await hmgetAsync(
      SP_500_REDIS_KEY,
      LAST_UPDATED,
      TICKER_SYMBOLS
    );

    if (cachedData.some((el) => !el)) {
      throw new Error("Redis cache was set up incorrectly");
    }

    const tickerSymbols = cachedData[1].split(",");
    // Add extra buffer
    const intervalDelay = ((24 * 60 * 60 * 1000) / 500) * 3 + 1000;

    const companyInfoUpdateInterval = setInterval(async () => {
      try {
        if (tickerSymbols.length === 0) {
          clearInterval(companyInfoUpdateInterval);
          return;
        }

        const currSymbol = tickerSymbols.shift();
        const companyData: any = {};

        for (const aVFunction of alphaVantageFunctions) {
          const params = {
            function: aVFunction,
            symbol: currSymbol,
            apikey: alphaVantageKey,
          };

          const { data } = await axios.get(alphaVantageApiUrl, {
            params,
          });

          companyData[aVFunction] = data;
        }

        if (Object.keys(companyData).length !== 3) {
          throw new Error("Function data error");
        }

        companyData[LAST_UPDATED] = new Date();

        await hmsetAsync(
          COMPANY_INFO_SUFFIX,
          currSymbol,
          JSON.stringify(companyData)
        );

        console.log(
          `| Redis LOG | SP500 Company info update on ${new Date().toDateString()}`
        );
      } catch (error) {
        console.log(`| API ERROR | Alpha Vantage API | ${error}`);
      }
    }, intervalDelay);
  } catch (error) {
    console.log(`| Redis ERROR | ${error}`);
  }
};

const twelveDataApiUrl = "https://api.twelvedata.com/time_series";

const updateCompanyTimeSeries = async () => {
  try {
    const cachedData: string[] = await hmgetAsync(
      SP_500_REDIS_KEY,
      LAST_UPDATED,
      TICKER_SYMBOLS
    );

    if (cachedData.some((el) => !el)) {
      throw new Error("Redis cache was set up incorrectly");
    }

    const tickerSymbols = cachedData[1].split(",");
    // Add extra buffer
    const intervalDelay = Math.ceil(60000 / 8) + 1000;

    const companyTimeSeriesUpdateInterval = setInterval(async () => {
      try {
        if (tickerSymbols.length === 0) {
          clearInterval(companyTimeSeriesUpdateInterval);
          return;
        }
        const currSymbol = tickerSymbols.shift();

        const params = {
          symbol: currSymbol,
          apikey: twelveDataKey,
          interval: "1day",
        };

        const { data } = await axios.get(twelveDataApiUrl, {
          params,
        });

        if (!data.meta) {
          throw new Error("No/invalid result");
        }

        data.meta[LAST_UPDATED] = new Date();

        await hmsetAsync(
          COMPANY_TIME_SERIES_SUFFIX,
          currSymbol,
          JSON.stringify(data)
        );
        console.log(
          `| Redis LOG | SP500 Company time series update on ${new Date().toDateString()}`
        );
      } catch (error) {
        console.log(`| API Error | Twelve Data | ${error}`);
      }
    }, intervalDelay);
  } catch (error) {
    console.log(`| Redis Error | ${error}`);
  }
};

app.get("/sp500-companies", async (req: Request, res: Response) => {
  try {
    const cachedData: string[] = await hmgetAsync(
      SP_500_REDIS_KEY,
      LAST_UPDATED,
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
    console.log(`| Endpoint ERROR | ${error}`);
    const errorData = {
      error: error.message,
    };
    res.status(500).json(errorData);
  }
});

app.get("/sp500-info", async (req: Request, res: Response) => {
  try {
    const cachedData: string[] = await hmgetAsync(
      SP_500_REDIS_KEY,
      LAST_UPDATED,
      TICKER_SYMBOLS
    );

    if (cachedData.some((el) => !el)) {
      throw new Error("Redis cache was set up incorrectly");
    }

    const tickerSymbols = cachedData[1].split(",");
    const sp500CompanyInfo: any = {};

    // Can't use forEach because Babel/TS transform to generator function
    // https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop

    for (const tickerSymbol of tickerSymbols) {
      const companyInfo = await hmgetAsync(COMPANY_INFO_SUFFIX, tickerSymbol);

      // Allow failing silently for now
      if (companyInfo.length > 0) {
        sp500CompanyInfo[tickerSymbol] = JSON.parse(companyInfo[0]);
      }
    }

    res.status(200).json(sp500CompanyInfo);
  } catch (error) {
    console.log(`| Endpoint ERROR | ${error}`);
    const errorData = {
      error: error.message,
    };
    res.status(500).json(errorData);
  }
});

app.get("/sp500-time-series", async (req: Request, res: Response) => {
  try {
    const cachedData: string[] = await hmgetAsync(
      SP_500_REDIS_KEY,
      LAST_UPDATED,
      TICKER_SYMBOLS
    );

    if (cachedData.some((el) => !el)) {
      throw new Error("Redis cache was set up incorrectly");
    }

    const tickerSymbols = cachedData[1].split(",");
    const sp500CompanyTimeSeries: any = {};

    for (const tickerSymbol of tickerSymbols) {
      const companyInfo = await hmgetAsync(
        COMPANY_TIME_SERIES_SUFFIX,
        tickerSymbol
      );

      // Allow failing silently for now
      if (companyInfo.length > 0) {
        sp500CompanyTimeSeries[tickerSymbol] = JSON.parse(companyInfo[0]);
      }
    }

    res.status(200).json(sp500CompanyTimeSeries);
  } catch (error) {
    console.log(`| Endpoint ERROR | ${error}`);
    const errorData = {
      error: error.message,
    };
    res.status(500).json(errorData);
  }
});

export default app;
