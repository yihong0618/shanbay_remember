const https = require("https");
const fs = require("fs");
const { spawn } = require('child_process');

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log("Please add telegram token,telegram chatId, and shanbay cookie")
  return
}
const token = args[0];
const chatId = args[1];
const cookie = args[2]

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
let count = 0
async function chapGPT(words) {
  console.log(`counts => ${count}`, 'words = ', words)
  count++
  // TODO: 此代码调用这个接口太频繁, 会报错
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
    // console.log('--chatGPT --', response["data"]["choices"][0]["message"]["content"]);
    return response["data"]["choices"][0]["message"]["content"]
};

const PATH_API = (page, materialbookId = 'blozps', wordsType='NEW') =>
  `/wordsapp/user_material_books/${materialbookId}/learning/words/today_learning_items?ipp=10&page=${page}&type_of=${wordsType}`;

const options = {
  hostname: "apiv3.shanbay.com",
  method: "GET",
  "Content-Type": "application/json",
  headers: { Cookie: cookie },
};

const wordsMessageMap = new Map([
  ["NEW", "new words"],
  ["REVIEW", "review words"],
])


const mp3DirMap = new Map([
  ["NEW", "MP3_NEW"],
  ["REVIEW", "MP3_REVIEW"],
])

const mp3ArticleMap = new Map([
  ["NEW", "new"],
  ["REVIEW", "review"],
])

class Func {
  static loop(cnt, func) {
    "v"
      .repeat(cnt)
      .split("")
      .map((_, idx) => func(idx));
  }
}

class Num {
  static get(num) {
    return num >>> 0;
  }

  static xor(a, b) {
    return this.get(this.get(a) ^ this.get(b));
  }

  static and(a, b) {
    return this.get(this.get(a) & this.get(b));
  }

  static mul(a, b) {
    const high16 = ((a & 0xffff0000) >>> 0) * b;
    const low16 = (a & 0x0000ffff) * b;
    return this.get((high16 >>> 0) + (low16 >>> 0));
  }

  static or(a, b) {
    return this.get(this.get(a) | this.get(b));
  }

  static not(a) {
    return this.get(~this.get(a));
  }

  static shiftLeft(a, b) {
    return this.get(this.get(a) << b);
  }

  static shiftRight(a, b) {
    return this.get(a) >>> b;
  }

  static mod(a, b) {
    return this.get(this.get(a) % b);
  }
}

const MIN_LOOP = 8;
const PRE_LOOP = 8;

const BAY_SH0 = 1;
const BAY_SH1 = 10;
const BAY_SH8 = 8;
const BAY_MASK = 0x7fffffff;

class Random {
  constructor() {
    this.status = [];
    this.mat1 = 0;
    this.mat2 = 0;
    this.tmat = 0;
  }

  seed(seeds) {
    Func.loop(4, (idx) => {
      if (seeds.length > idx) {
        this.status[idx] = Num.get(seeds.charAt(idx).charCodeAt());
      } else {
        this.status[idx] = Num.get(110);
      }
    });

    [, this.mat1, this.mat2, this.tmat] = this.status;

    this.init();
  }

  init() {
    Func.loop(MIN_LOOP - 1, (idx) => {
      this.status[(idx + 1) & 3] = Num.xor(
        this.status[(idx + 1) & 3],
        idx +
          1 +
          Num.mul(
            1812433253,
            Num.xor(
              this.status[idx & 3],
              Num.shiftRight(this.status[idx & 3], 30)
            )
          )
      );
    });

    if (
      (this.status[0] & BAY_MASK) === 0 &&
      this.status[1] === 0 &&
      this.status[2] === 0 &&
      this.status[3] === 0
    ) {
      this.status[0] = 66;
      this.status[1] = 65;
      this.status[2] = 89;
      this.status[3] = 83;
    }

    Func.loop(PRE_LOOP, () => this.nextState());
  }

  nextState() {
    let x;
    let y;

    [, , , y] = this.status;
    x = Num.xor(
      Num.and(this.status[0], BAY_MASK),
      Num.xor(this.status[1], this.status[2])
    );
    x = Num.xor(x, Num.shiftLeft(x, BAY_SH0));
    y = Num.xor(y, Num.xor(Num.shiftRight(y, BAY_SH0), x));
    [, this.status[0], this.status[1]] = this.status;
    this.status[2] = Num.xor(x, Num.shiftLeft(y, BAY_SH1));
    this.status[3] = y;
    this.status[1] = Num.xor(
      this.status[1],
      Num.and(-Num.and(y, 1), this.mat1)
    );
    this.status[2] = Num.xor(
      this.status[2],
      Num.and(-Num.and(y, 1), this.mat2)
    );
  }

  generate(max) {
    this.nextState();

    let t0;

    [, , , t0] = this.status;
    const t1 = Num.xor(this.status[0], Num.shiftRight(this.status[2], BAY_SH8));
    t0 = Num.xor(t0, t1);
    t0 = Num.xor(Num.and(-Num.and(t1, 1), this.tmat), t0);

    return t0 % max;
  }
}

class Node {
  constructor() {
    this.char = ".";
    this.children = {};
  }

  getChar() {
    return this.char;
  }

  getChildren() {
    return this.children;
  }

  setChar(char) {
    this.char = char;
  }

  setChildren(k, v) {
    this.children[k] = v;
  }
}

const B32_CODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const B64_CODE =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const CNT = [1, 2, 2, 2, 2, 2];

class Tree {
  constructor() {
    this.random = new Random();
    this.sign = "";
    this.inter = {};
    this.head = new Node();
  }

  init(sign) {
    this.random.seed(sign);
    this.sign = sign;

    Func.loop(64, (i) => {
      this.addSymbol(B64_CODE[i], CNT[parseInt((i + 1) / 11, 10)]);
    });
    this.inter["="] = "=";
  }

  addSymbol(char, len) {
    let ptr = this.head;
    let symbol = "";

    Func.loop(len, () => {
      let innerChar = B32_CODE[this.random.generate(32)];
      while (
        innerChar in ptr.getChildren() &&
        ptr.getChildren()[innerChar].getChar() !== "."
      ) {
        innerChar = B32_CODE[this.random.generate(32)];
      }

      symbol += innerChar;
      if (!(innerChar in ptr.getChildren())) {
        ptr.setChildren(innerChar, new Node());
      }

      ptr = ptr.getChildren()[innerChar];
    });

    ptr.setChar(char);
    this.inter[char] = symbol;
    return symbol;
  }

  decode(enc) {
    let dec = "";
    for (let i = 4; i < enc.length; ) {
      if (enc[i] === "=") {
        dec += "=";
        i++;
        continue; // eslint-disable-line
      }
      let ptr = this.head;
      while (enc[i] in ptr.getChildren()) {
        ptr = ptr.getChildren()[enc[i]];
        i++;
      }
      dec += ptr.getChar();
    }

    return dec;
  }
}

const getIdx = (c) => {
  const x = c.charCodeAt();
  if (x >= 65) {
    return x - 65;
  }
  return x - 65 + 41;
};

const VERSION = 1;

const checkVersion = (s) => {
  const wi = getIdx(s[0]) * 32 + getIdx(s[1]);
  const x = getIdx(s[2]);
  const check = getIdx(s[3]);

  return VERSION >= (wi * x + check) % 32;
};

const decode = (enc) => {
  if (!checkVersion(enc)) {
    return "";
  }

  const tree = new Tree();
  tree.init(enc.substr(0, 4));
  const rawEncode = tree.decode(enc);
  let buff = Buffer.from(rawEncode, "base64");
  return JSON.parse(buff.toString("utf8"));
};

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

    res.on("end", () => {
      console.log("send2telegram end");
    })
  });

  req.on("error", (error) => {
    console.error('send2telegram ERROR', error);
  });

  req.write(data);
  req.end();
}

async function getMaterialBookIdApi() {
  const materialBookOpts = { ...options, path: '/wordsapp/user_material_books/current' };

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

function downloadAudio(audioUrl, audioName, wordsType) {
  const dirName = mp3DirMap.get(wordsType)
  const file = fs.createWriteStream(`${dirName}/${audioName}.mp3`);
  https.get(audioUrl, function(response) {
    response.pipe(file);
  });
}

// materialbookId: mnvdu

/**
 * 存在的问题：
 * 频繁请求被openai拒绝
 * 音频不存在
 * 只有最后10个单词生成的文章能发送到telegram
 * 
*/
async function getAndSendResult(materialbookId, message = "", page = 1, wordsType="NEW") {
  let results = "";
  options.path = PATH_API(page, materialbookId, wordsType);
  // 获取wordsType，第page页单词
  let req = https.request(options, function (res) {
    res.on("data", function (chunk) {
      results = results + chunk;
    });
    res.on("end", async function () {
      // 只是每一页的单词
      const toDecodeData = JSON.parse(results).data
      // if you are not remember new word, send nothing
      if (!toDecodeData) {
        return
      }
      const resultJson = decode(toDecodeData);
      const totalNew = resultJson.total
      if (totalNew === 0) { // 没有单词不要发送
        return
      }
      console.log('resultJson ==> ', resultJson)
      const pageCount = 1// Math.ceil(resultJson.total / 10);
      let wordsArray = [];
      const wordsObject = resultJson.objects;
      let i = (page - 1) * 10 + 1;
      wordsObject.forEach((w) => {
        const wordsName = w.vocab_with_senses.word;
        wordsArray.push(wordsName);
        const audioUrl =  w.vocab_with_senses.sound.audio_us_urls[0]
        if (audioUrl) {
          downloadAudio(audioUrl, i, wordsType)
          i++
        }
      });
      if (page === 1) {
        const wordsMessageType = wordsMessageMap.get(wordsType)
        message += `Today's ${totalNew} ${wordsMessageType}\n`;
      }
      message += wordsArray.join("\n");
      const cMessage = wordsArray.join(",");
      message += "\n";

      await send2telegram(message);
      const chatGPTMessage = await chapGPT(cMessage) // TODO: 这里需要降低频率
      // console.log('chatGPTMessage ==> ', chatGPTMessage)
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
      // 这么操作，只会发送最后一页的内容
      if (page < pageCount) {
        page += 1;
        getAndSendResult(materialbookId, message, page, wordsType);
      }
      // else {
      // }
    });
  }
);
  req.on("error", function (e) {
    console.log("getAndSendResult error", e);
  });
  req.end();
}

async function main() {
  const materialbookId = await getMaterialBookIdApi()
  message = await getAndSendResult(materialbookId); // new words
  await getAndSendResult(materialbookId, message="", page=1, wordsType="REVIEW") // old words
}

main()
