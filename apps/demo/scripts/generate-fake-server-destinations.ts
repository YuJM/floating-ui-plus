import {mkdir} from 'node:fs/promises';

import {fakerEN_US as faker} from '@faker-js/faker';

import {
  multilingualDestinations,
  type MultilingualDestination,
} from '../src/multilingual-destinations';

const output = new URL(
  '../public/fixtures/fake-server-destinations.json',
  import.meta.url,
);
const seed = 20_260_801;
const countryCount = 240;

const localizedSearchAliases: Readonly<Record<string, MultilingualDestination>> = {
  'Republic of Korea': multilingualDestinations[0]!,
  Japan: multilingualDestinations[1]!,
  China: multilingualDestinations[2]!,
  Germany: multilingualDestinations[3]!,
};

function createCountryCatalog() {
  const countries: string[] = [];
  const seen = new Set<string>();
  while (countries.length < countryCount) {
    const country = faker.location.country();
    if (seen.has(country)) continue;
    seen.add(country);
    countries.push(country);
  }
  return countries;
}

function createDestination(
  country: string,
  index: number,
): MultilingualDestination {
  const searchAlias = localizedSearchAliases[country];
  const airline = faker.airline.airline();
  const flightNumber = faker.airline.flightNumber({addLeadingZeros: true});
  const recordCode = faker.string.alphanumeric({
    length: 6,
    casing: 'upper',
  });

  return {
    id: `remote-${recordCode.toLowerCase()}`,
    label: country,
    region: `Global destination · record ${String(index + 1).padStart(3, '0')}`,
    language: `${airline.iataCode}${flightNumber} · ${airline.name}`,
    keywords: [country, ...(searchAlias?.keywords ?? [])],
    countryKeywords: [
      country,
      ...(searchAlias?.countryKeywords ?? []),
    ],
    value: country.toLocaleLowerCase(),
  };
}

faker.seed(seed);
const destinations = createCountryCatalog().map(createDestination);

await mkdir(new URL('../public/fixtures/', import.meta.url), {recursive: true});
await Bun.write(output, `${JSON.stringify(destinations, null, 2)}\n`);
console.log(`Wrote ${destinations.length} fixed server destinations.`);
