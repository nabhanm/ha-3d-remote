/* HA 3D Remote - your home.
   Everything house-specific is in this file: the scenes row, rooms and their lights, the 3D floor plan,
   the TV remote, the shopping list, weather and the Controls page extras. The app (index.html) reads it on load.
   Entity IDs come from Home Assistant: Settings -> Devices & services -> Entities.
   The example below is the author's own flat; replace the entity IDs, then redraw PLAN for your home. */
"use strict";
// The scenes row: first one button for every light (red = all off, tap = all on; green = some on, tap = all off),
// then these scenes as icons (the name shows for a moment when one is tapped).
const SCENES = [
  { id: "scene.bright",         name: "Bright",      icon: "sun"   },
  { id: "scene.dinner",         name: "Dinner",      icon: "dinner"},
  { id: "scene.movie_night",    name: "Movie night", icon: "film"  },
  { id: "scene.relax",          name: "Relax",       icon: "sofa"  },
  { id: "scene.goodnight",      name: "Goodnight",   icon: "moon"  },
];
// Each room is a heading with tiles under it. One tile = one thing you can tap on/off.
//   dim: true        → shows a brightness slider while the light is on
//   plug: true       → a smart plug: the tile is red while off and green while on
//   colour: true     → shows colour choices on the room's own page while the light is on
//   homeOnly: true   → not a room: its tiles are the Controls page (quick toggles), no room tile
//   light: false     → not counted in the "2 lights on" line at the top
//   power / autoOffMin → shows watts and a countdown (geyser)
//   press: "script…" → a button that runs something instead of a switch
//   quiet: true      → not mentioned in the line at the top when it is on
//   all: the group the "All on / All off" button uses (optional)
//   sleep: a timer helper → a "turn the light off in 15/30/60 min" card on the room's page
//   meters: read-only numbers in a card at the top of the room's own page, e.g. kWh  { id, name }
// Room scenes (same lists as the Rooms tab in Home Assistant): scenes = the bulbs' built-in WiZ scenes,
//   target = the light or light group they are sent to, dimAll: true = one brightness slider for the whole room
const ROOMS = [
  { name: "Living room", tab: "Living", icon: "sofa", all: "light.living_room_lights",
    target: "light.living_room_lights", targetName: "both lights", dimAll: true,
    scenes: ["Warm white", "Daylight", "Focus", "Relax", "Cozy", "TV time", "Fireplace", "Party", "Night light"], things: [
    { id: "light.living_room_light",      name: "Ceiling light", icon: "ceiling", dim: true, colour: true },
    { id: "light.living_room_floor_lamp", name: "Floor lamp",    icon: "lamp",    dim: true, colour: true },
  ]},
  { name: "Bedroom", icon: "bed", target: "light.bedroom_light", sleep: "timer.bedroom_light_sleep",
    scenes: ["Warm white", "Relax", "Cozy", "Bedtime", "Night light", "Candlelight", "Wake-up", "Romance", "Ocean"], things: [
    { id: "light.bedroom_light", name: "Bedroom light", icon: "ceiling", dim: true, colour: true },
  ]},
  { name: "Dining", icon: "dinner", all: "group.dining_lights", target: "light.dining_bamboo_lamp", targetName: "bamboo lamp",
    scenes: ["Warm white", "Daylight", "Cozy", "Candlelight", "Fireplace", "TV time", "Relax", "Party"], things: [
    { id: "light.dining_bamboo_lamp",   name: "Bamboo lamp",  icon: "pendant", dim: true, colour: true },
    { id: "switch.dining_fairy_lights", name: "Fairy lights", icon: "sparkle", plug: true },
  ]},
  { name: "Bathroom", tab: "Bath", icon: "water", meterTitle: "Geyser energy", meters: [
    { id: "sensor.geyser_energy_this_month", name: "This month" },
    { id: "sensor.geyser_energy_total",     name: "All-time" },
  ], things: [
    { id: "switch.geyser", name: "Geyser", icon: "water", plug: true, light: false, power: "sensor.geyser_power", autoOffMin: 30 },
  ]},
  { name: "Quick toggles", homeOnly: true, things: [
    { id: "input_boolean.lights_holiday_mode", name: "Holiday mode", icon: "bag", light: false, short: true,
      onText: "All automations paused", offText: "Off" },
    { id: "automation.evening_lights", name: "Evening lights", icon: "sun", light: false, quiet: true, short: true,
      onText: "At sunset", offText: "Paused" },
    { id: "automation.bedroom_wind_down", name: "Wind-down", icon: "moon", light: false, quiet: true, short: true,
      onText: "Bedroom, 11 PM", offText: "Paused" },
  ]},
];

// Colour choices for lights: k = a white (colour temperature), h = a colour (hue 0-360)
const COLOURS = [
  { name: "Warm white", k: 2700, css: "#ffbf70" },
  { name: "Soft white", k: 4000, css: "#ffe6c7" },
  { name: "Daylight",   k: 6500, css: "#dfeaff" },
  { gap: true },
  { name: "Red",    h: 0,   css: "#ff4d3d" },
  { name: "Orange", h: 28,  css: "#ff8a2a" },
  { name: "Yellow", h: 54,  css: "#ffe03a" },
  { name: "Green",  h: 120, css: "#45d35f" },
  { name: "Aqua",   h: 180, css: "#3fd6d6" },
  { name: "Blue",   h: 228, css: "#4d7dff" },
  { name: "Purple", h: 275, css: "#a55cff" },
  { name: "Pink",   h: 325, css: "#ff5fb7" },
];
// Floor plan page. Everything is in feet, measured from the top-left corner of the flat, taken from a floor plan.
// Walls are half a foot thick.
//   rooms:     rects = [x, y, width, depth] (a room can have more than one); page = which room's controls open when you zoom in
//   walls:     ["h", y, fromX, toX] runs left-right, ["v", x, fromY, toY] runs top-bottom; low = balcony railing on a 1 ft kerb
//              (piers: width of cement pillars at both ends); parapet = solid waist-high cement wall; door type "slot" = tall open slit;
//              doors = [from, to, hinge, side]: hinge "a"/"b" = which end the door hangs on, "slide" = sliding glass door, "frame" = doorway with a frame and no door (none = open doorway), side = which way it opens
//   furniture: [x1, y1, x2, y2, bottom, top, look, front] = a plain box, or with look "nightstand"/"desk"/"console" (front = the side
//              with the drawers / where you sit), "wardrobe", "screen", "dark" (the TV); or one of the ready-made pieces:
//              { chair: [x1, y1, x2, y2], back: side }   office chair
//              { beanbag: [x, y], face: side it faces }
//              { bench: [x1, y1, x2, y2], back: side }   slatted teak bench on a black frame
//              { plant: [x, y], size: "tall"/"bush"/"small" }   potted plant;  { tea: [x, y], chairs: "we" }  round tea table, chairs on those sides
//              { bed: [x1, y1, x2, y2], head: "n"/"s"/"e"/"w" }   head = which wall the pillows are at (n = top of the plan, w = left)
//              { sofa: [x1, y1, x2, y2], back: "n"/"s"/"e"/"w", seats: 3 }  back = which side the backrest is on
//              { table: [x1, y1, x2, y2], h: height, look: "pine"/"bedbase", chairs: [on each long side, at each end] }
//              { counter: [x1, y1, x2, y2], along: "n", front: "w", hob: [from, to], sink: [from, to] }   kitchen counter; front = the side you stand at; hob/sink measured from the "along" end
//              { wc: [x1, y1, x2, y2], back: side the cistern is on },  { geyser: [x1, y1, x2, y2] } (hangs on the wall)
//              { basin: [x1, y1, x2, y2], back: wall side },  { shower: [x, y], wall: side } (x, y = where the pipe meets that wall)
//              { fridge: [x1, y1, x2, y2] },  { washer: [x1, y1, x2, y2], front: side its glass door faces }
//   rugs:      [x, y, width, depth] carpets, drawn flat on the floor
//   lamps:     where each device sits (z = height); wall: "n"/"s"/"e"/"w" = it hangs on that wall of its room
const PLAN = {
  wallH: 3.2,
  rooms: [
    { name: "Bedroom 2", floor: "wood", labelAt: [8.1, 9.3], rects: [[2.75, 0.5, 10.75, 11.5]] },
    { name: "Toilet",  floor: "wet", labelAt: [15.8, 8.3], rects: [[14, 4, 7.5, 5]] },
    { name: "Dining",      page: "Dining", floor: "wood", labelAt: [26, 10.8], rects: [[22, 0.5, 5.75, 11.5]] },
    { name: "",            floor: "wood", rects: [[14, 9.5, 8, 6], [22, 12, 3.25, 3.5]] },   // passage from the bedrooms, open to the dining and kitchen
    { name: "Niche",       label: false, floor: "wood", rects: [[25.25, 12, 2.5, 3]] },
    { name: "Kitchen",     floor: "wood", labelAt: [23.6, 21.4], rects: [[19.5, 15.5, 8.25, 6], [21.75, 21.5, 6, 3.5]] },
    { name: "Bedroom",     page: "Bedroom", floor: "wood", labelAt: [9.2, 21.6], rects: [[4.75, 12.5, 8.75, 10]] },
    { name: "Bathroom",    page: "Bathroom", floor: "wet", rects: [[14, 15.5, 5, 6]] },
    { name: "Utility",  floor: "out",  labelAt: [18.6, 24.9], rects: [[14, 22, 7.75, 3.5]] },
    { name: "Living room", page: "Living room", floor: "wood", labelAt: [37, 7.2], rects: [[27.75, 0.5, 14, 19.5]] },
    { name: "Balcony",  floor: "out", rects: [[28.25, 20.5, 13.5, 4.5]] },
    { name: "Balcony",  floor: "out", rects: [[4.75, 23, 4, 4.83]] },
  ],
  walls: [
    ["h", 0, 2.25, 14],
    ["h", 0, 21.5, 42.25],                                                     // the fairy-lights wall: dining + living, straight through to the main-door wall
    ["h", 3.5, 13.5, 22],                                                      // toilet's back wall (a duct behind it, left out of the plan)
    ["h", 9, 14, 21.5, { doors: [[19.3, 21.5, "b", -1]] }],
    ["h", 12, 2.25, 14, { doors: [[2.85, 4.2, "window"]] }],
    ["h", 15, 13.5, 27.75, { doors: [[22.25, 24.95, "frame"]] }],
    ["h", 21.5, 13.5, 22.25],
    ["h", 22.5, 4.25, 9.25, { doors: [[5.45, 8.05, "a", 1]] }],                       // bedroom wall with the balcony door; from here to the utility the wardrobe doors are the wall
    ["h", 24.5, 8.75, 14], ["v", 8.75, 22.5, 25],                               // walls behind and beside the built-in wardrobe
    ["h", 25, 21.75, 28.25],                                                       // kitchen window wall, in line with the balcony edge
    ["h", 25.5, 13.5, 22.25],
    ["h", 20, 27.75, 42.25, { doors: [[33.75, 38.75, "slide"]] }],             // sliding glass door to the balcony
    ["h", 11.5, 25.25, 28.25],                                                 // fridge niche back wall towards the dining
    ["h", 25, 28.25, 41.75, { low: true }],                                    // main balcony railing, between the end walls
    ["h", 27.83, 4.75, 8.75, { low: true, piers: 0.8 }],
    ["v", 2.25, 0, 12.5],
    ["v", 13.5, 0, 12, { doors: [[9.7, 11.9, "b", -1]] }],
    ["v", 21.5, 0, 9.5],                                                       // toilet's east wall, on up past the duct to the top of the flat
    ["v", 41.75, 0, 20.5, { doors: [[4.3, 7.6, "a", -1]] }],                   // main door, on the TV wall
    ["v", 41.75, 20.5, 25.5],
    ["v", 4.25, 12, 23], ["v", 4.25, 23, 28.33, { doors: [[24.1, 25.0, "slot"], [26.0, 26.9, "slot"]] }],
    ["v", 8.75, 25, 28.33, { parapet: true }],
    ["v", 13.5, 12.5, 26, { doors: [[12.7, 14.9, "a", -1], [17.9, 20.1, "a", 1]] }],   // bedroom door, and the bathroom door inside the bedroom (on the bathroom's long wall)
    ["v", 19, 15, 22],                                                         // bathroom/kitchen wall
    ["v", 21.75, 21.5, 26, { doors: [[22.1, 24.3, "a", -1]] }],
    ["v", 27.75, 11.5, 25.5],                                                  // wall behind the 3-seater: kitchen + niche, one straight wall
  ],
  furniture: [
    { bed: [4, 1, 10, 7.5], head: "n" },          // bed, bedroom 2
    [11.5, 0.5, 13.5, 9.6, 0, 3.3, "wardrobe", "w", { mirror: "end" }],
    [2.75, 8.3, 4.75, 11.9, 0, 2.5, "desk", "e"],
    [2.85, 9.35, 3.0, 10.85, 2.55, 3.6, "screen"],          // computer monitor
    { chair: [5, 9.45, 6.3, 10.75], back: "e" },
    { bed: [4.75, 14.5, 11.25, 20.5], head: "w" },     // bed, bedroom
    [4.85, 12.9, 6.25, 14.3, 0, 1.6, "nightstand", "e"],
    [9.25, 22.5, 13.5, 24.5, 0, 3.3, "wardrobe", "n", { dresser: [9.25, 10.65] }],
    { table: [25.65, 2.2, 30.65, 5.2], chairs: [2, 1] },   // pine dining table, close to the fairy-lights wall; chairs: 2 on each long side, 1 at each end (drawn in the 3D home)
    { sofa: [28.5, 13.3, 31.1, 19], back: "w" },     // brown leather 3-seater against the kitchen wall, south of the niche, facing the TV
    { sofa: [32, 10.6, 36.4, 13.2], back: "n", seats: 2 },   // matching 2-seater, at a right angle to it, facing the balcony (floor lamp in the corner between them)
    [40.6, 13.15, 41.75, 19.15, 0, 1.2, "console", "w"],  // TV unit: centred on the 3-seater and the coffee table
    [41.45, 13.75, 41.75, 18.55, 1.5, 3, "dark"], // TV
    { counter: [25.7, 15.5, 27.75, 25], along: "n", front: "w", hob: [6.2, 8.4] },   // kitchen counter along the wall behind the sofa; gas stove opposite the utility door
    { counter: [19.5, 15.5, 21.5, 21.5],   along: "n", front: "e", sink: [3.6, 5.6] },
    { table: [33.5, 14.75, 35.3, 17.55], h: 1.15, look: "bedbase" },        // coffee table, on the carpet
    { basin: [22, 7.3, 23.4, 8.7], back: "w", pedestal: true },
    { fridge: [25.95, 12.3, 27.65, 14.7] },       // refrigerator in the niche
    { washer: [14, 22.6, 16.1, 24.7], front: "e" },     // front-load washing machine against the utility's back wall, facing the stove through the door
    { shower: [15.6, 4], wall: "n" },             // shower head on the far wall, left
    { wc: [17.15, 4, 18.55, 6.2], back: "n" },    // WC in the middle of the far wall
    { basin: [19.9, 4, 21.3, 5.4], back: "n" },   // basin in the far right corner
    { geyser: [14, 5.7, 14.7, 6.9] },             // geyser on the left wall
    { shower: [19, 16.4], wall: "e" },            // shower head on the far wall, left corner
    { basin: [17.6, 17.6, 19, 19.3], back: "e" },   // basin on the far wall, right of centre
    { geyser: [15.9, 15.5, 17.1, 16.2] },         // geyser on the left wall
    { tea: [30.6, 22.75], chairs: "we" },         // main balcony: round tea table with a chair on each side, at the far end from the sliding door
    { bench: [40.25, 21.4, 41.65, 24.4], back: "e" },
    { plant: [28.95, 21.2], size: "tall" }, { plant: [39.45, 24.35], size: "bush" },
    { beanbag: [6.9, 26.1], face: "s" },
    { plant: [8.25, 27.35], size: "small" }, { plant: [5.4, 27.2], size: "bush" },
    { wc: [15.9, 19.3, 17.3, 21.5], back: "s" },    // WC on the right wall, opposite the geyser
  ],
  rugs: [[31.7, 13.4, 5.4, 5.5]],                // carpet between the sofas and the TV
  lamps: [
    { id: "light.living_room_light",      room: "Living room", x: 28.5,  y: 15.75, z: 3.35, icon: "ceiling", wall: "w" },
    { id: "light.living_room_floor_lamp", room: "Living room", x: 30.6,  y: 12.4,  z: 3.6, icon: "lamp" },   // in front of the niche wall, between the sofas
    { tv: true,                           room: "Living room", x: 41,    y: 16.15, z: 3.8, icon: "tv" },
    { id: "light.dining_bamboo_lamp",     room: "Dining",      x: 34.2,  y: 5.1,  z: 4.6, icon: "pendant" },   // on the ceiling behind the 2-seater
    { id: "switch.dining_fairy_lights",   room: "Dining",      x: 23.2,  y: 1.4,  z: 3.6, icon: "sparkle", plug: true, len: 7.2 },   // len = how wide the string spreads along the wall
    { id: "light.bedroom_light",          room: "Bedroom",     x: 9.1,   y: 12.75, z: 3.2, icon: "ceiling", wall: "n" },  // wall light, on the wall between the two bedrooms
    { id: "switch.geyser",                room: "Bathroom",    x: 16.5,  y: 16.3, z: 3.8, icon: "water",   plug: true },
  ],
};
// TV page
const TV = {
  remote: "remote.living_room_tv", player: "media_player.living_room_tv", status: "sensor.tv_status",
  power: "script.tv_power_toggle", openApp: "tv_open_app", game: "script.tv_game_time", gameName: "Game time (PS5)",
  apps: [["Netflix", "Netflix"], ["YouTube", "YouTube"], ["Prime", "Prime Video"], ["Hotstar", "Hotstar"], ["SonyLIV", "SonyLIV"], ["Apple TV", "Apple TV"]],
  keys: [   // same order as the TV page in Home Assistant
    ["Power", "power", null], ["Up", "up", "DPAD_UP"], ["Home", "house", "HOME"],
    ["Left", "left", "DPAD_LEFT"], ["OK", "ok", "DPAD_CENTER"], ["Right", "right", "DPAD_RIGHT"],
    ["Back", "back", "BACK"], ["Down", "down", "DPAD_DOWN"], ["Play / Pause", "playpause", "MEDIA_PLAY_PAUSE"],
    ["Vol −", "voldown", "VOLUME_DOWN"], ["Mute", "mute", "VOLUME_MUTE"], ["Vol +", "volup", "VOLUME_UP"],
  ],
};

// Shopping list page: Home Assistant's own shopping list, shared by everyone who signs in
const LIST = { id: "todo.shopping_list" };
// Today's weather in the top line of the Home page (Home Assistant's weather, from met.no)
const WEATHER = { id: "weather.forecast_home" };
// Controls page extras: speakers (play/pause + volume) and an AdGuard pause button.
// Use speakers: [] and adguard: null to hide them. The AdGuard button needs rest_command.adguard_pause / adguard_resume in HA.
const EXTRA = {
  speakers: [["media_player.living_room_speaker", "Living room speaker"], ["media_player.bedroom_speaker", "Master bedroom speaker"], ["media_player.all_speakers", "All speakers"]],
  adguard: "sensor.adguard_protection",
};
