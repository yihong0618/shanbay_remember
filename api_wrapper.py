from abc import abstractmethod
from typing import List, Any, Dict
import subprocess, json
class baseBackendAPI():
    @abstractmethod
    def getWordList(self, kargv: Dict[str, Any])->List[Any]:
        pass

class ShanbayAPI(baseBackendAPI):
    cookie: str
    def __init__(self, cookies: str):
        self.cookie = cookies
    def getWordList(self, kargv: Dict[str, Any])->List[Any]:
        process = subprocess.Popen(
            ['node', './entrypoint.js', kargv.get("type"), self.cookie],
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
            )
        stdout, stderr = process.communicate()
        print(stderr.decode('utf-8'))
        return json.loads(stdout.decode('utf-8'))

if __name__ == "__main__":
    with open('cookie.txt', 'r') as f:
        cookie = f.read()
    api = ShanbayAPI(cookie)
    print(api.getWordList({"type": "NEW"})[0])