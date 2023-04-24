import https from "https"
import { decode } from "./api_utils.js"


class API {
  WORDS_TYPE = {
    "NEW": "NEW",
    "REVIEW": "REVIEW"
  }
  baseOptions = {
    hostname: "apiv3.shanbay.com",
    method: "GET",
    "Content-Type": "application/json",
    headers: {},
  };

  constructor(cookie) {
    this.baseOptions.headers["Cookie"] = cookie

  }

  async getDefaultMaterialBookIdApi() {
    const materialBookOpts = { ...this.baseOptions, path: '/wordsapp/user_material_books/current' };

    return new Promise((resolve, reject) => {
      const req = https.request(materialBookOpts, (res) => {
        let results = '';
        res.on('data', (chunk) => {
          results = results + chunk;
        })
        res.on("end", () => {
          try {
            const id = JSON.parse(results).materialbook_id;
            resolve(id);
          } catch (e) {
            reject(e.message);
          }
        })
      })
      req.on('error', reject);
      req.end();
    })
  }

  async getWordsInPageApi(page, materialBookId, wordsType) {
    const newOptions = {
      ...this.baseOptions,
      path: `/wordsapp/user_material_books/${materialBookId}/learning/words/today_learning_items?ipp=10&page=${page}&type_of=${wordsType}`
    }
    return new Promise((resolve, reject) => {
      let results = "";
      let req = https.request(newOptions,
        function (res) {
          res.on("data", function (chunk) {
            results = results + chunk;
          });
          res.on("end", async function () {
            const toDecodeData = JSON.parse(results).data
            // if you are not remember new word, send nothing
            if (!toDecodeData) {
              return
            }
            const resultJson = decode(toDecodeData);
            resolve(resultJson)
          })
        });
      req.on("error", reject);
      req.end();
    });
  }

  async getWordsAllApi(materialBookId, wordsType) {
    let page = 1;
    let words = [];
    while (true) {
      const data = await this.getWordsInPageApi(page, materialBookId, wordsType);
      const wordsInPage = data.objects;
      if (wordsInPage.length === 0) {
        break;
      }
      words = words.concat(wordsInPage);
      page++;
    }
    return words;
  }
}


export default API;