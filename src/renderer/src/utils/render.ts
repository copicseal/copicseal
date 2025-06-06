const logos = import.meta.glob<string>('../assets/logos/*.svg', {
  eager: true,
  import: 'default',
});

const logoMap = Object.keys(logos).reduce(
  (map, path) => {
    const key = path.split('/').pop()?.split('.')[0];
    if (key)
      map[key.toUpperCase()] = logos[path];

    return map;
  },
  {} as Record<string, string>,
);

export const renderUtils = {
  getMakeName,
  getMakeLogo,
  getModelName,
};

function getModelName(model?: string) {
  if (!model)
    return '';

  const modelMap: { [key: string]: string } = {
    // 'ILCE-7M4': 'α7M4'
  };

  if (modelMap[model]) {
    return modelMap[model];
  }

  const modelFormatMap: { [key: string]: string | -1 } = {
    'ILCE-': 'α',
    'NIKON Z ': 'ℤ',
    'Canon': -1,
    'Digital Camera': -1,
  };

  const matchKey = Object.keys(modelFormatMap).find((key) => {
    return new RegExp(`\\b${key}\\b`, 'i').test(model);
  });
  if (matchKey) {
    const val = modelFormatMap[matchKey];
    if (typeof val === 'string') {
      return model.replace(matchKey, val).trim();
    }
    else if (val === -1) {
      return model.replace(new RegExp(matchKey), '').trim();
    }
  }

  if (modelFormatMap[model]) {
    return modelFormatMap[model];
  }

  return model;
}

function getMakeName(make?: string) {
  if (!make)
    return '';

  const makeMap: { [key: string]: string } = {
    SONY: 'Sony',
    Leica: 'Leica',
    OM: 'Olympus',
    NIKON: 'Nikon',
    Panasonic: 'Lumix',
  };

  if (makeMap[make])
    return makeMap[make];

  const matchKey = Object.keys(makeMap).find((key) => {
    return new RegExp(`\\b${key}\\b`, 'i').test(make);
  });
  if (matchKey)
    return makeMap[matchKey];

  return make;
}

function getMakeLogo(make?: string) {
  return make && logoMap[getMakeName(make).toUpperCase()];
}
