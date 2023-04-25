import API from "./api.js";
const args = process.argv.slice(2);

if (args.length != 2) {
    process.stdout.write('{"error": "Invalid Arguments: Number of Arguments"}')
    exit()
}
const type = args[0]; // NEW or REVIEW
if (!["NEW", "REVIEW"].includes(type)) {
    process.stdout.write('{"error": "Invalid Arguments: Type should be NEW or REVIEW"}')
    exit()
}
const cookie = args[1];
const api = new API(cookie);



async function main() {
    const id = await api.getDefaultMaterialBookIdApi();
    const result = await api.getWordsAllApi(id, type);
    process.stdout.write(JSON.stringify(result))
}
main()