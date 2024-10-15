import base64

# python版本的api.js

class Decoder:
    @staticmethod
    def get_idx(c):
        x = ord(c)
        if x >= 65:
            return x - 65
        return x - 65 + 41

    @staticmethod
    def check_version(s):
        wi = Decoder.get_idx(s[0]) * 32 + Decoder.get_idx(s[1])
        x = Decoder.get_idx(s[2])
        check = Decoder.get_idx(s[3])
        return 1 >= (wi * x + check) % 32

    @staticmethod
    def decode(enc):
        if not Decoder.check_version(enc):
            return ""
        tree = Tree()
        tree.init(enc[:4])
        raw_encode = tree.decode(enc)
        return base64.b64decode(raw_encode).decode('utf-8')


class Node:
    def __init__(self):
        self.chat = '.'
        self.children = {}

    def get_char(self):
        return self.chat

    def set_char(self, charr):
        self.chat = charr

    def set_children(self, k, v):
        self.children[k] = v

    def get_children(self):
        return self.children


class Num:
    @staticmethod
    def get(num):
        return num & 0xFFFFFFFF

    @staticmethod
    def xor(a, b):
        return Num.get(a ^ b)

    @staticmethod
    def and_(a, b):
        return Num.get(a & b)

    @staticmethod
    def mul(a, b):
        high16 = (a & 0xffff0000) * b
        low16 = (a & 0x0000ffff) * b
        return Num.get(high16 + low16)

    @staticmethod
    def or_(a, b):
        return Num.get(a | b)

    @staticmethod
    def not_(a):
        return Num.get(~a)

    @staticmethod
    def shift_left(a, b):
        return Num.get(a << b)

    @staticmethod
    def shift_right(a, b):
        return Num.get(a >> b)

    @staticmethod
    def mod(a, b):
        return Num.get(a % b)


class Random:
    MIN_LOOP = 8
    PRE_LOOP = 8
    BAY_SH0 = 1
    BAY_SH1 = 10
    BAY_SH8 = 8
    BAY_MASK = 0x7fffffff

    def __init__(self):
        self.status = [0] * 4
        self.mat1 = 0
        self.mat2 = 0
        self.tmat = 0

    def seed(self, seeds):
        for i in range(4):
            self.status[i] = Num.get(ord(seeds[i])) if i < len(seeds) else Num.get(110)
        self.mat1 = self.status[1]
        self.mat2 = self.status[2]
        self.tmat = self.status[3]
        self.init()

    def init(self):
        for idx in range(Random.MIN_LOOP - 1):
            idx1 = idx + 1
            status1 = self.status[idx1 & 3]
            status2 = self.status[idx & 3]
            shifted_status = Num.shift_right(status2, 30)
            xor_result1 = Num.xor(status2, shifted_status)
            mul_result = Num.mul(1812433253, xor_result1)
            add_result = idx1 + mul_result
            xor_result2 = Num.xor(status1, add_result)
            self.status[idx1 & 3] = xor_result2

        if all(s == 0 for s in self.status):
            self.status = [66, 65, 89, 83]

        for _ in range(Random.PRE_LOOP):
            self.next_state()

    def next_state(self):
        y = self.status[3]
        x = Num.xor(Num.and_(self.status[0], Random.BAY_MASK), Num.xor(self.status[1], self.status[2]))
        x = Num.xor(x, Num.shift_left(x, Random.BAY_SH0))
        y = Num.xor(y, Num.xor(Num.shift_right(y, Random.BAY_SH0), x))
        self.status = [self.status[1], self.status[2], Num.xor(x, Num.shift_left(y, Random.BAY_SH1)), y]
        self.status[1] = Num.xor(self.status[1], Num.and_(-Num.and_(y, 1), self.mat1))
        self.status[2] = Num.xor(self.status[2], Num.and_(-Num.and_(y, 1), self.mat2))

    def generate(self, max_val):
        self.next_state()
        t0 = self.status[3]
        t1 = Num.xor(self.status[0], Num.shift_right(self.status[2], Random.BAY_SH8))
        t0 = Num.xor(t0, t1)
        t0 = Num.xor(Num.and_(-Num.and_(t1, 1), self.tmat), t0)
        return (t0 % max_val + max_val) % max_val


class Tree:
    B32_CODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    B64_CODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    CNT = [1, 2, 2, 2, 2, 2]

    def __init__(self):
        self.random = Random()
        self.sign = ""
        self.inner = {}
        self.head = Node()

    def init(self, sign):
        self.random.seed(sign)
        self.sign = sign
        for i in range(64):
            self.add_symbol(Tree.B64_CODE[i], Tree.CNT[(i + 1) // 11])

    def add_symbol(self, ch, length):
        ptr = self.head
        symbol = []
        for _ in range(length):
            inner_char = Tree.B32_CODE[self.random.generate(32)]
            while inner_char in ptr.get_children() and ptr.get_children()[inner_char].get_char() != '.':
                inner_char = Tree.B32_CODE[self.random.generate(32)]
            symbol.append(inner_char)
            if inner_char not in ptr.get_children():
                ptr.set_children(inner_char, Node())
            ptr = ptr.get_children()[inner_char]
        ptr.set_char(ch)
        self.inner[ch] = ''.join(symbol)
        return ''.join(symbol)

    def decode(self, enc):
        dec = []
        i = 4
        while i < len(enc):
            if enc[i] == '=':
                dec.append('=')
                i += 1
                continue
            ptr = self.head
            while i < len(enc) and enc[i] in ptr.get_children():
                ptr = ptr.get_children()[enc[i]]
                i += 1
            dec.append(ptr.get_char())
        return ''.join(dec)
