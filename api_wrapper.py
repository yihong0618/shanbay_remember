from abc import abstractmethod
from typing import List, Any, Dict
import subprocess, json
class baseBackendAPI():
    @abstractmethod

    def getWordList(self, kargv: Dict[str, Any])->List[Dict[str, Any]]:
    # Belike: 
    # [
    #     {
    #         "word": "abandon",
    #         "voice_url": "https://anything.com/abandon.mp3",
    #     }
    # ]
        pass

class ShanbayAPI(baseBackendAPI):
    cookie: str
    def __init__(self, cookies: str):
        self.cookie = cookies
    def getWordList(self, kargv: Dict[str, Any])->List[Dict[str, Any]]:
        process = subprocess.Popen(
            ['node', './entrypoint.js', kargv.get("type"), self.cookie],
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
            )
        stdout, stderr = process.communicate()
        print(stderr.decode('utf-8'))
        raw = json.loads(stdout.decode('utf-8'))
        return [
            {
                "word": i["vocab_with_senses"]["word"],
                "voice_url": i["vocab_with_senses"]["sound"]["audio_us_urls"][0],
            }
            for i in raw
        ]

if __name__ == "__main__":
    with open('cookie.txt', 'r') as f:
        cookie = f.read()
    api = ShanbayAPI(cookie)
    print(api.getWordList({"type": "NEW"})[0])