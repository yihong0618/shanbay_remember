
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
        for (let i = 4; i < enc.length;) {
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


export { decode };