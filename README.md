# precious
A hub for Steam Economy item rates, populated from the Steam Community Market and some third-party cash-for-item sellers

## Setup
```
git clone https://github.com/antigravities/precious
cd precious
npm i
cp config.json.example config.json
$EDITOR config.json # see Sample configuration, below
PORT=3000 node index.js
```

## Sample configuration
```json
{
    "connectionString": "mysql://[username]:[password]@[host]:[port]/[database]",
    "bitskins": {
        "key": "BitSkins API key, see their Web site for details",
        "secret": "BitSkins authentication secret, see their Web site for details"
    },
    "backpack": "Backpack.tf API key, see their Web site for details",
    "fontawesome": "Font Awesome kit key",
    "track": {
        "Item ID": {
            "name": "Item name. Shows up on site.",
            "econid": "The economy ID, or nameid, of the item you want to track.",
            "image": "A URL to an image to show next to the item name.",
            "scmurl": "The URL on the Steam Community Market to this item, i.e. 753/753-Sack%20of%20Gems",
            "bitskins": [ "Item title (must match BitSkins)", "Item appID" ],
            "backpack": [ "Item appID", "Item name", "Item quality", "Item craftability" ]
        },
        "Item Average ID": {
            "name": "Average name. Shows up on site.",
            "averageOf": [
                "item_id_1",
                "item_id_2",
                "item_id_3"
            ],
            "image": "A URL to an image to show next to the item name."
        }
    }
}
```

## License
```
precious, a hub for Steam Economy item rates
Copyright (c) 2019 Cutie Cafe.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
