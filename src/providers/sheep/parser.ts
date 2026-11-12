import * as cheerio from 'cheerio';
import {scrapeWithFlareSolverr} from "../../helper/httpRequests.ts";

const response = await scrapeWithFlareSolverr('https://www.sheepesports.com/fr/all/leagues/lec');
if (response == null) {
    throw new Error()
}
const $ = cheerio.load(response.html);
const Name = $('h1').text().trim()

const Teams = $('h2')
    .filter((i, el) => $(el).text().trim() === "Équipes participantes").next().children()
    .map((i, el) => $(el).find('a').attr('title')?.trim())
console.log(Teams)
