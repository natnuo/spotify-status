const $ = require("jquery");
export const visualLength = (s, fontSize) => {
  return $("#ruler").css("fontSize", fontSize).css("fontWeight", fontWeight).html(s).get(0).offsetWidth;
};

export const trimStringToVisualLength = (
  element,
  fontSize = "primary"
) => {
  $(element).toArray().forEach((e) => {
    const lengthPixels = e.offsetWidth;
    const s = $(e).html();
    if (visualLength(s, fontSize) < lengthPixels) return s;
  
    // in the future could do a binary search but kinda lazy rn :)
    for (let l = s.length - 3; l > 0; l--) {
      const substring = `${s.substring(0, l)}...`;
      if (visualLength(substring, fontSize) < lengthPixels) {
        $(e).html(substring);
        return;
      }
    }
  })
};
