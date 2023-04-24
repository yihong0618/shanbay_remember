import { createRequire } from 'module'
const require = createRequire(import.meta.url);
const https = require("https");
const fs = require("fs");
const { spawn } = require('child_process');
const { Configuration, OpenAIApi } = require("openai");
const { exit } = require("process");
import API from "./api.js";

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log("Please add telegram token,telegram chatId, and shanbay cookie")
  exit()
}
const token = args[0];
const chatId = args[1];
const cookie = args[2];

const api = new API(cookie);


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function chapGPT(words) {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    // copy from https://github.com/piglei/ai-vocabulary-builder
    messages: [
      {
        role: "user",
        content: `Please write a short story which is less than 300 words, the story should use simple words and these special words must be included: ${words}. Also surround every special word with a single '*' character at the beginning and the end.`
      }
    ],
  });
  console.log(response["data"]["choices"][0]["message"]["content"]);
  return response["data"]["choices"][0]["message"]["content"]
};


const mp3DirMap = new Map([
  ["NEW", "MP3_NEW"],
  ["REVIEW", "MP3_REVIEW"],
])

const mp3ArticleMap = new Map([
  ["NEW", "new"],
  ["REVIEW", "review"],
])

async function send2telegram(text) {
  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  });
  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: "/bot" + token + "/sendMessage",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on("data", () => {
      console.log("succeed");
    });
  });

  req.on("error", (error) => {
    console.error(error);
  });

  req.write(data);
  req.end();
}

async function downloadAudio(audioUrl, audioName, wordsType) {
  const dirName = mp3DirMap.get(wordsType)
  const file = fs.createWriteStream(`${dirName}/${audioName}.audio`);
  return new Promise((resolve, reject) => {
    https.get(audioUrl, function (response) {
      response.pipe(file);
      response.on("end", () => { resolve() });
      response.on("error", (err) => { reject(err) });
    });
  });
}

async function getAndSendResult(materialbookId, wordsType) {
  const totalNew = (await api.getWordsInPageApi(1, materialbookId, wordsType)).total;
  const description = {
    "NEW": "new words",
    "REVIEW": "review words",
  }
  let message = `Today's ${totalNew} ${description[wordsType]}\n`
  let wordsArray = [];
  const wordsObject = await api.getWordsAllApi(materialbookId, wordsType);
  for (let i = 0; i < wordsObject.length; i++) {
    let w = wordsObject[i];
    const wordsName = w.vocab_with_senses.word;
    wordsArray.push(wordsName);
    const audioUrl = w.vocab_with_senses.sound.audio_us_urls[0]
    if (audioUrl)
      await downloadAudio(audioUrl, i, wordsType)
  }

  message += wordsArray.join("\n");
  const cMessage = wordsArray.join(",");
  message += "\n";

  await send2telegram(message);
  const chatGPTMessage = await chapGPT(cMessage)
  // await send2telegram(await chapGPT(chatGPTMessage));
  await send2telegram(chatGPTMessage);
  const articleName = mp3ArticleMap.get(wordsType)
  const child = spawn('edge-tts', ['--text', `"${chatGPTMessage}"`, '--write-media', `${articleName}_article.mp3`]);
  child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

async function main() {
  const materialbookId = await api.getDefaultMaterialBookIdApi()
  await getAndSendResult(materialbookId, api.WORDS_TYPE.NEW); // new words
  await getAndSendResult(materialbookId, api.WORDS_TYPE.REVIEW); // old words
}

main()
