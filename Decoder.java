import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class Decoder {
    static long getIdx(char c) {
        long x = c;
        if (x >= 65) {
            return x - 65;
        }
        return x - 65 + 41;
    }

    static boolean checkVersion(String s) {
        long wi = getIdx(s.charAt(0)) * 32 + getIdx(s.charAt(1));
        long x = getIdx(s.charAt(2));
        long check = getIdx(s.charAt(3));

        return 1 >= (wi * x + check) % 32;
    }

    public static String decode(String enc) {
        if (!checkVersion(enc)) {
            return "";
        }
        Tree tree = new Tree();
        tree.init(enc.substring(0, 4));
        String rawEncode = tree.decode(enc);
        return new String(java.util.Base64.getDecoder().decode(rawEncode), StandardCharsets.UTF_8);
    }
}


class Node {
    Character chat = '.';
    Map<Character, Node> children;

    public Map<Character, Node> getChildren() {
        return children;
    }

    public Node() {
        children = new HashMap<>();
    }

    public Character getChar() {
        return chat;
    }

    public void setChar(Character charr) {
        this.chat = charr;
    }

    public void setChildren(Character k, Node v) {
        this.children.put(k, v);
    }
}

class Num {
    static long get(long num) {
        return (num >>> 0) % 4294967296L;
    }

    static long xor(long a, long b) {
        return get(get(a) ^ get(b));
    }

    static long and(long a, long b) {
        return get(get(a) & get(b));
    }

    public static long mul(long a, long b) {
        long high16 = ((a & 0xffff0000L) >>> 0) * b;
        long low16 = (a & 0x0000ffffL) * b;
        return get((high16 >>> 0) + (low16 >>> 0));
    }

    static long or(long a, long b) {
        return get(get(a) | get(b));
    }

    static long not(long a) {
        return get(~get(a));
    }

    static long shiftLeft(long a, long b) {
        return get(get(a) << b);
    }

    static long shiftRight(long a, long b) {
        return get(a) >>> b;
    }

    static long mod(long a, long b) {
        return get(get(a) % b);
    }
}

class Random {
    static final long MIN_LOOP = 8;
    static final long PRE_LOOP = 8;

    static final long BAY_SH0 = 1;
    static final long BAY_SH1 = 10;
    static final long BAY_SH8 = 8;
    static final long BAY_MASK = 0x7fffffff;
    long[] status = new long[4];
    long mat1;
    long mat2;
    long tmat;

    void seed(String seeds) {
        for (int i = 0; i < 4; i++) {
            if (seeds.length() > i) {
                this.status[i] = Num.get(seeds.charAt(i));
            } else {
                this.status[i] = Num.get(110);
            }
        }
        mat1 = status[1];
        mat2 = status[2];
        tmat = status[3];
        init();
    }

    void init() {
        for (int idx = 0; idx < MIN_LOOP - 1; idx++) {
            int idx1 = idx + 1;
            long status1 = this.status[(idx1) & 3];
            long status2 = this.status[idx & 3];
            long shiftedStatus = Num.shiftRight(status2, 30);
            long xorResult1 = Num.xor(status2, shiftedStatus);
            long mulResult = Num.mul(1812433253, xorResult1);
            long addResult = idx1 + mulResult;
            long xorResult2 = Num.xor(status1, addResult);
            this.status[idx1 & 3] = xorResult2;
        }
        if ((status[0] & BAY_MASK) == 0 && status[1] == 0 && status[2] == 0 && status[3] == 0) {
            status[0] = 66;
            status[1] = 65;
            status[2] = 89;
            status[3] = 83;
        }

        for (long idx = 0; idx < PRE_LOOP; idx++) {
            nextState();
        }
    }

    private void nextState() {
        long x;
        long y = status[3];
        x = Num.xor(Num.and(status[0], BAY_MASK), Num.xor(status[1], status[2]));
        x = Num.xor(x, Num.shiftLeft(x, BAY_SH0));
        y = Num.xor(y, Num.xor(Num.shiftRight(y, BAY_SH0), x));
        status[0] = status[1];
        status[1] = status[2];
        status[2] = Num.xor(x, Num.shiftLeft(y, BAY_SH1));
        status[3] = y;
        status[1] = Num.xor(status[1], Num.and(-Num.and(y, 1), mat1));
        status[2] = Num.xor(status[2], Num.and(-Num.and(y, 1), mat2));
    }

    public int generate(long max) {
        nextState();
        long t0 = status[3];
        long t1 = Num.xor(status[0], Num.shiftRight(status[2], BAY_SH8));
        t0 = Num.xor(t0, t1);
        t0 = Num.xor(Num.and(-Num.and(t1, 1), tmat), t0);
        return (int) (((t0 % max) + max) % max);
    }
}

class Tree {
    static final String B32_CODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    static final String B64_CODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    static final long[] CNT = {1, 2, 2, 2, 2, 2};
    Random random;
    String sign;
    Map<Character, String> inner;

    Node head;

    Tree() {
        this.random = new Random();
        sign = "";
        inner = new HashMap<>();
        head = new Node();
    }

    void init(String sign) {
        this.random.seed(sign);
        this.sign = sign;
        for (int i = 0; i <= 63; i++) {
            addSymbol(B64_CODE.charAt(i), CNT[(i + 1) / 11]);
        }
    }

    private String addSymbol(char ch, long len) {
        Node ptr = this.head;
        StringBuilder symbol = new StringBuilder();
        for (long i = 0; i < len; i++) {
            char innerChar = B32_CODE.charAt(random.generate(32));

            while (ptr.getChildren().containsKey(innerChar) && ptr.getChildren().get(innerChar).getChar() != '.') {
                innerChar = B32_CODE.charAt(random.generate(32));
            }
            symbol.append(innerChar);
            if (!ptr.getChildren().containsKey(innerChar)) {
                ptr.setChildren(innerChar, new Node());
            }
            ptr = ptr.getChildren().get(innerChar);
        }
        ptr.setChar(ch);
        inner.put(ch, symbol.toString());
        return symbol.toString();
    }

    String decode(String enc) {
        StringBuilder dec = new StringBuilder();
        for (int i = 4; i < enc.length(); ) {
            if (enc.charAt(i) == '=') {
                dec.append('=');
                i++;
                continue;
            }
            Node ptr = head;
            while (i < enc.length() && ptr.getChildren().containsKey(enc.charAt(i))) {
                ptr = ptr.getChildren().get(enc.charAt(i));
                i++;
            }
            dec.append(ptr.getChar());
        }
        return dec.toString();
    }
}


