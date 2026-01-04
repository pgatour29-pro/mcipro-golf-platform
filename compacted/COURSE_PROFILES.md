# Course Profiles Catalog
## Location: public/scorecard_profiles/
## Last Updated: 2025-12-27

## Overview
Course profiles contain hole-by-hole data for golf courses including par, stroke index, and course ratings.

## Profile Format (YAML)

```yaml
course_name: "Pattaya Country Club"
course_id: "pattaya_cc"
tees:
  - name: "Blue"
    color: "blue"
    rating: 72.1
    slope: 128
    holes:
      - hole_number: 1
        par: 4
        distance: 380
        handicap: 7  # Stroke index
      # ... 18 holes
```

## Available Courses

| Course | File | Image |
|--------|------|-------|
| Bangpakong Riverside CC | bangpakong.yaml | bangpakongriversidecountryclub.jpg |
| Bangpra International | bangpra.yaml | Bangpra-International-Golf-Club-scorecard.jpg |
| Burapha A/C | burapha_ac.yaml | BuraphaAC.jpg |
| Burapha C/D | burapha_cd.yaml | BuraphaCD.jpg |
| Burapha East | burapha_east.yaml | - |
| Crystal Bay | crystal_bay.yaml | crystal-bay-scorecard.jpg |
| Eastern Star | eastern_star.yaml | - |
| Grand Prix GC | grand_prix.yaml | GrandPrixGolfClub.jpg |
| Greenwood | greenwood.yaml | - |
| Hermes | hermes.yaml | - |
| Khao Kheow | khao_kheow.yaml | khaokheow.jpg |
| Laem Chabang | laem_chabang.yaml | Laem_Chabang.jpg |
| Mountain Shadow | mountain_shadow.yaml | mountain_shadow-2.jpg |
| Pattana | pattana.yaml | pattanascoreCard.gif |
| Pattavia | pattavia.yaml | pattavia.png |
| Pattaya County | pattaya_county.yaml | Pattayacountyclub.jpg |
| Phoenix | phoenix.yaml | - |
| Pleasant Valley | pleasant_valley.yaml | pleasant-valley-golf-scorecard.jpg |
| Plutaluang | plutaluang.yaml | plutaluang-north-west.jpg |
| Royal Lakeside | royal_lakeside.yaml | royal-lake-side-golf-club.jpg |
| Siam CC Old | siam_cc_old.yaml | Siam-cc-old-course-scorecard.jpg |
| Siam Plantation | siam_plantation.yaml | siamplantation.jpg |
| Treasure Hill | treasure_hill.yaml | - |
| Generic | generic.yaml | - |

## JSON Profiles (Extended Data)

Some courses have JSON profiles with additional data:

### easternstar.json
```json
{
  "course_name": "Eastern Star",
  "holes": [
    {
      "hole_number": 1,
      "par": 4,
      "handicap": 11,
      "distance_blue": 385,
      "distance_white": 365
    }
    // ...
  ]
}
```

### royal_lakeside_data.json
Extended data for Royal Lakeside including multiple tee options.

## Usage in Application

```javascript
// Load course profile
const profile = await fetch('/scorecard_profiles/pattaya_county.yaml')
  .then(r => r.text())
  .then(yaml => jsyaml.load(yaml));

// Get hole data
const hole = profile.tees[0].holes.find(h => h.hole_number === 1);
console.log(hole.par, hole.handicap); // 4, 7
```

## Adding New Course

1. Create YAML file with course data
2. Add scorecard image (optional)
3. Test in scorecard system
4. Verify stroke index allocation
