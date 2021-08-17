/**
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/**
 * ProductAdvertisingAPI
 * https://webservices.amazon.com/paapi5/documentation/index.html
 *
 * This file is for signing PAAPI request with AWS V4 Signing. For more details, see
 * https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html
 *
 * Do not edit the class manually.
 *
 */

// sources of inspiration:
// http://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html

var crypto = require("crypto-js");

var createAuthHeader = function (
  accessKey,
  secretKey,
  requestHeaders,
  httpMethod,
  path,
  payload,
  region,
  service,
  timestamp
) {
  /* Step 1: Create Signed Headers */
  var signedHeaders = createSignedHeaders(requestHeaders);

  /* Step 2: Create Canonical Request */
  var canonicalRequest = createCanonicalRequest(
    httpMethod,
    path,
    {},
    requestHeaders,
    payload
  );

  /* Step 3: Create String To Sign */
  var stringToSign = createStringToSign(
    timestamp,
    region,
    service,
    canonicalRequest
  );

  /* Step 4: Create Signature Headers */
  var signature = createSignature(
    secretKey,
    timestamp,
    region,
    service,
    stringToSign
  );

  /* Step 5: Create Authorization Header */
  var authorizationHeader = createAuthorizationHeaders(
    timestamp,
    accessKey,
    region,
    service,
    signedHeaders,
    signature
  );

  return authorizationHeader;
};

var createAuthorizationHeaders = function (
  timestamp,
  accessKey,
  region,
  service,
  signedHeaders,
  signature
) {
  return [
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${createCredentialScope(
      timestamp,
      region,
      service
    )}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");
};

var createCanonicalRequest = function (
  method,
  pathname,
  query,
  headers,
  payload
) {
  return [
    method.toUpperCase(),
    pathname,
    "",
    createCanonicalHeaders(headers),
    createSignedHeaders(headers),
    hexEncodedHash(payload)
  ].join("\n");
};

var createCanonicalQueryString = function (params) {
  return Object.keys(params)
    .sort()
    .map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    })
    .join("&");
};

var createCanonicalHeaders = function (headers) {
  return Object.keys(headers)
    .sort()
    .map(
      (name) =>
        `${name.toLowerCase().trim()}:${headers[name].toString().trim()}\n`
    )
    .join("");
};

var createSignedHeaders = function (headers) {
  return Object.keys(headers)
    .sort()
    .map((name) => name.toLowerCase().trim())
    .join(";");
};

var createCredentialScope = function (time, region, service) {
  return [toDate(time), region, service, "aws4_request"].join("/");
};

var createStringToSign = function (time, region, service, request) {
  return [
    "AWS4-HMAC-SHA256",
    toTime(time),
    createCredentialScope(time, region, service),
    hexEncodedHash(request)
  ].join("\n");
};

var createSignature = function (secret, time, region, service, stringToSign) {
  var h1 = hmac("AWS4" + secret, toDate(time)); // date-key
  var h2 = hmac(h1, region); // region-key
  var h3 = hmac(h2, service); // service-key
  var h4 = hmac(h3, "aws4_request"); // signing-key
  return hmac(h4, stringToSign).toString(crypto.enc.Hex);
};

var toTime = (time) =>
  new Date(time).toISOString().replace(/[:\-]|\.\d{3}/g, "");

var toDate = (time) => toTime(time).substring(0, 8);

var hmac = (key, data) => crypto.HmacSHA256(data, key);

var hexEncodedHash = (data) => crypto.SHA256(data).toString(crypto.enc.Hex);

// NPR code follows:

var fetch = require("node-fetch");

const KEY = process.env.AMAZON_PRODUCT_ADVERTISING_KEY;
const SECRET = process.env.AMAZON_PRODUCT_ADVERTISING_SECRET;
const TAG = process.env.AMAZON_PRODUCT_ADVERTISING_TAG;

var searchProductAPI = async function (query) {
  const host = "webservices.amazon.com";
  const path = "/paapi5/searchitems";
  const url = `https://${host}${path}`;
  const region = "us-east-1";
  const service = "ProductAdvertisingAPI";
  const method = "POST";

  var timestamp = Date.now();

  const requestHeaders = {
    host,
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=utf-8",
    "x-amz-target": `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems`,
    "x-amz-date": toTime(timestamp)
  };

  // Returning only the first page of results, i.e. ({ ItemPage: 1 }),
  // which has been sufficient
  var payload = JSON.stringify({
    ...query,
    PartnerTag: TAG,
    PartnerType: "Associates",
    SearchIndex: "Books",
    Merchant: "All",
    Availability: "IncludeOutOfStock",
    ItemCount: 10, // Increase to get more results (max. of 10)
    Resources: [
      "Images.Primary.Large", // Cover photo
      "ItemInfo.Title", // Title
      "ItemInfo.ByLineInfo", // Author, publisher
      "ItemInfo.ExternalIds", // ISBNs,
      "ItemInfo.ContentInfo",
      "ItemInfo.ProductInfo"
    ]
  });

  var authorizationHeader = createAuthHeader(
    KEY,
    SECRET,
    requestHeaders,
    method,
    path,
    payload,
    region,
    service,
    timestamp
  );

  var headers = {
    Authorization: authorizationHeader,
    ...requestHeaders
  };

  // Send the request
  var response = await fetch(url, {
    headers,
    method,
    body: payload
  });

  if (response.status == 429) {
    throw new Error("Rate limited");
  }

  if (response.status == 401) {
    throw new Error("Signature error");
  }

  var json = await response.json();
  if (!json.SearchResult) return [];
  return json.SearchResult.Items || [];
};

module.exports = {
  searchProductAPI
};

var test = async function () {
  var response = await searchProductAPI({
    Keyword: "Data Feminism",
    Author: "d'ignazio"
  });
  console.log(JSON.stringify(response[0], null, 2));
};

// test();
