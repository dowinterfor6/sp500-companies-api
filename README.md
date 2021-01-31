# S&P 500 Companies API

## **DISCLAIMER**

S&P 500 Company ticker symbols endpoint collects data from a Wikipedia page via Wiki Api (since this is the only available source of data at [List of S&P 500 companies](https://en.wikipedia.org/wiki/List_of_S%26P_500_companies)), and therefore relies on the Wikipedia page being accurate. Company information and time series data is provided by [Alpha Vantage](https://www.alphavantage.co/) and [Twelve Data](https://twelvedata.com/) respectively, and to be used for non-commercial, personal use only. `dateAdded` and `last_updated` refer to when this server last fetched information, not when the information was actually updated.

## GET api.achan.dev/sp500-companies

### S&P 500 company ticker symbols

```JSON
{
  "dateAdded": "Sun Jan 31 2021 08:26:31 GMT+0000 (Coordinated Universal Time)",
  "tickerSymbols": [
    "MMM",
    "ABT",
    ...
  ]
}
```

## GET api.achan.dev/sp500-info

### S&P 500 company information overview, income statement, and balance sheet

```JSON
{
  "MMM": {
    "OVERVIEW": {
      "Symbol": "MMM",
      "AssetType": "Common Stock",
      "Name": "3M Company",
      "Description": "3M Company develops ...",
      "Exchange": "NYSE",
      "Currency": "USD",
      "Country": "USA",
      "Sector": "Industrials",
      "Industry": "Specialty Industrial Machinery",
      "Address": "3M Center, St. Paul, MN, United States, 55144-1000",
      "FullTimeEmployees": "0",
      "FiscalYearEnd": "December",
      "LatestQuarter": "2020-12-31",
      "MarketCapitalization": "101487566848",
      "EBITDA": "8732999680",
      "PERatio": "18.9903",
      "PEGRatio": "3.1937",
      "BookValue": "22.382",
      "DividendPerShare": "5.88",
      "DividendYield": "0.0335",
      "EPS": "9.25",
      "RevenuePerShareTTM": "55.72",
      "ProfitMargin": "0.1673",
      "OperatingMarginTTM": "0.212",
      "ReturnOnAssetsTTM": "0.0927",
      "ReturnOnEquityTTM": "0.4674",
      "RevenueTTM": "32184000512",
      "GrossProfitTTM": "15579000000",
      "DilutedEPSTTM": "9.25",
      "QuarterlyEarningsGrowthYOY": "0.435",
      "QuarterlyRevenueGrowthYOY": "0.058",
      "AnalystTargetPrice": "179.73",
      "TrailingPE": "18.9903",
      "ForwardPE": "18.622",
      "PriceToSalesRatioTTM": "3.2285",
      "PriceToBookRatio": "8.5431",
      "EVToRevenue": "3.6473",
      "EVToEBITDA": "17.334",
      "Beta": "0.916",
      "52WeekHigh": "186.58",
      "52WeekLow": "117.7127",
      "50DayMovingAverage": "172.7794",
      "200DayMovingAverage": "166.7473",
      "SharesOutstanding": "577750016",
      "SharesFloat": "577166111",
      "SharesShort": "8139533",
      "SharesShortPriorMonth": "7604893",
      "ShortRatio": "3.19",
      "ShortPercentOutstanding": "0.01",
      "ShortPercentFloat": "0.0141",
      "PercentInsiders": "0.189",
      "PercentInstitutions": "66.533",
      "ForwardAnnualDividendRate": "5.88",
      "ForwardAnnualDividendYield": "0.0335",
      "PayoutRatio": "0.5495",
      "DividendDate": "2020-12-12",
      "ExDividendDate": "2020-11-19",
      "LastSplitFactor": "2:1",
      "LastSplitDate": "2003-09-30"
    },
    "INCOME_STATEMENT": {
      "symbol": "MMM",
      "annualReports": [
        {
          "fiscalDateEnding": "2020-12-31",
          "reportedCurrency": "USD",
          "totalRevenue": "32184000000",
          "totalOperatingExpense": "25412000000",
          "costOfRevenue": "16605000000",
          "grossProfit": "15579000000",
          "ebit": "6772000000",
          "netIncome": "5384000000",
          "researchAndDevelopment": "1878000000",
          "effectOfAccountingCharges": "None",
          "incomeBeforeTax": "6711000000",
          "minorityInterest": "None",
          "sellingGeneralAdministrative": "6929000000",
          "otherNonOperatingIncome": "None",
          "operatingIncome": "6772000000",
          "otherOperatingExpense": "None",
          "interestExpense": "None",
          "taxProvision": "1318000000",
          "interestIncome": "None",
          "netInterestIncome": "None",
          "extraordinaryItems": "None",
          "nonRecurring": "None",
          "otherItems": "None",
          "incomeTaxExpense": "1318000000",
          "totalOtherIncomeExpense": "-61000000",
          "discontinuedOperations": "None",
          "netIncomeFromContinuingOperations": "5388000000",
          "netIncomeApplicableToCommonShares": "5384000000",
          "preferredStockAndOtherAdjustments": "None"
        },
        ...
      ]
    },
    "BALANCE_SHEET": {
      "symbol": "MMM",
      "annualReports": [
        {
          "fiscalDateEnding": "2020-12-31",
          "reportedCurrency": "USD",
          "totalAssets": "47344000000",
          "intangibleAssets": "19637000000",
          "earningAssets": "None",
          "otherCurrentAssets": "325000000",
          "totalLiabilities": "34413000000",
          "totalShareholderEquity": "12931000000",
          "deferredLongTermLiabilities": "None",
          "otherCurrentLiabilities": "3578000000",
          "commonStock": "12931000000",
          "retainedEarnings": "None",
          "otherLiabilities": "8476000000",
          "goodwill": "None",
          "otherAssets": "2440000000",
          "cash": "4634000000",
          "totalCurrentLiabilities": "7948000000",
          "shortTermDebt": "None",
          "currentLongTermDebt": "806000000",
          "otherShareholderEquity": "12931000000",
          "propertyPlantEquipment": "10285000000",
          "totalCurrentAssets": "14982000000",
          "longTermInvestments": "None",
          "netTangibleAssets": "-6706000000",
          "shortTermInvestments": "404000000",
          "netReceivables": "4705000000",
          "longTermDebt": "17989000000",
          "inventory": "4239000000",
          "accountsPayable": "2561000000",
          "totalPermanentEquity": "None",
          "additionalPaidInCapital": "None",
          "commonStockTotalEquity": "None",
          "preferredStockTotalEquity": "None",
          "retainedEarningsTotalEquity": "None",
          "treasuryStock": "None",
          "accumulatedAmortization": "None",
          "otherNonCurrrentAssets": "2440000000",
          "deferredLongTermAssetCharges": "None",
          "totalNonCurrentAssets": "32362000000",
          "capitalLeaseObligations": "256000000",
          "totalLongTermDebt": "17989000000",
          "otherNonCurrentLiabilities": "8476000000",
          "totalNonCurrentLiabilities": "26465000000",
          "negativeGoodwill": "None",
          "warrants": "None",
          "preferredStockRedeemable": "None",
          "capitalSurplus": "None",
          "liabilitiesAndShareholderEquity": "None",
          "cashAndShortTermInvestments": "5038000000",
          "accumulatedDepreciation": "None",
          "commonStockSharesOutstanding": "None"
        },
        ...
      ]
    },
    "last_updated": "2021-01-31T08:35:12.561Z"
  },
  ...
}
```

## GET api.achan.dev/sp500-time-series

### S&P 500 company time series, per day for last 30 days

```JSON
{
  "MMM": {
    "meta": {
      "symbol": "MMM",
      "interval": "1day",
      "currency": "USD",
      "exchange_timezone": "America/New_York",
      "exchange": "NYSE",
      "type": "Common Stock",
      "last_updated": "2021-01-31T08:26:40.635Z"
    },
    "values": [
      {
          "datetime": "2021-01-29",
          "open": "182.28999",
          "high": "182.98000",
          "low": "174.87010",
          "close": "175.66000",
          "volume": "4059804"
      },
      ...
    ]
  },
  ...
}
```

## Issues

- Wiki Api call to get ticker symbols needs more robust validation