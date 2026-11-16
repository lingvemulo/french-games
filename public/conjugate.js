// French conjugation for the 50 verbs in data.js.
//
//   FG_CONJ.conjugate("nous", "passé composé", "finir")
//     -> { text: "nous avons fini" }
//     -> { text: null, note: "..." } when the combination doesn't exist
//
// Works in the browser (window.FG_CONJ) and in Node (module.exports) for testing.

(function (root) {
  // person index: je, tu, il/elle/on, nous, vous, ils/elles
  const PERSON = { je: 0, tu: 1, il: 2, elle: 2, on: 2, nous: 3, vous: 4, ils: 5, elles: 5 };
  const w = s => s.split(" ");

  // Only what can't be derived by rule is listed here.
  const VERBS = {
    "être":       { pres: w("suis es est sommes êtes sont"), pp: "été", fut: "ser", imparfait: "ét",
                    subj: w("sois sois soit soyons soyez soient"), imp: w("sois soyons soyez") },
    "avoir":      { pres: w("ai as a avons avez ont"), pp: "eu", fut: "aur",
                    subj: w("aie aies ait ayons ayez aient"), imp: w("aie ayons ayez") },
    "faire":      { pres: w("fais fais fait faisons faites font"), pp: "fait", fut: "fer",
                    subj: w("fasse fasses fasse fassions fassiez fassent") },
    "aller":      { pres: w("vais vas va allons allez vont"), pp: "allé", aux: "être", fut: "ir",
                    subj: w("aille ailles aille allions alliez aillent") },
    "dire":       { pres: w("dis dis dit disons dites disent"), pp: "dit" },
    "pouvoir":    { pres: w("peux peux peut pouvons pouvez peuvent"), pp: "pu", fut: "pourr",
                    subj: w("puisse puisses puisse puissions puissiez puissent"), imp: null },
    "vouloir":    { pres: w("veux veux veut voulons voulez veulent"), pp: "voulu", fut: "voudr",
                    subj: w("veuille veuilles veuille voulions vouliez veuillent"), imp: w("veuille veuillons veuillez") },
    "savoir":     { pres: w("sais sais sait savons savez savent"), pp: "su", fut: "saur",
                    subj: w("sache saches sache sachions sachiez sachent"), imp: w("sache sachons sachez") },
    "voir":       { pres: w("vois vois voit voyons voyez voient"), pp: "vu", fut: "verr" },
    "venir":      { pres: w("viens viens vient venons venez viennent"), pp: "venu", aux: "être", fut: "viendr" },
    "devoir":     { pres: w("dois dois doit devons devez doivent"), pp: "dû", fut: "devr" },
    "prendre":    { pres: w("prends prends prend prenons prenez prennent"), pp: "pris" },
    "mettre":     { pres: w("mets mets met mettons mettez mettent"), pp: "mis" },
    "boire":      { pres: w("bois bois boit buvons buvez boivent"), pp: "bu" },
    "partir":     { pres: w("pars pars part partons partez partent"), pp: "parti", aux: "être" },
    "sortir":     { pres: w("sors sors sort sortons sortez sortent"), pp: "sorti", aux: "être" },
    "dormir":     { pres: w("dors dors dort dormons dormez dorment"), pp: "dormi" },
    "lire":       { pres: w("lis lis lit lisons lisez lisent"), pp: "lu" },
    "écrire":     { pres: w("écris écris écrit écrivons écrivez écrivent"), pp: "écrit" },
    "comprendre": { pres: w("comprends comprends comprend comprenons comprenez comprennent"), pp: "compris" },
    "apprendre":  { pres: w("apprends apprends apprend apprenons apprenez apprennent"), pp: "appris" },
    "connaître":  { pres: w("connais connais connaît connaissons connaissez connaissent"), pp: "connu" },
    "croire":     { pres: w("crois crois croit croyons croyez croient"), pp: "cru" },
    "tenir":      { pres: w("tiens tiens tient tenons tenez tiennent"), pp: "tenu", fut: "tiendr" },
    "ouvrir":     { pres: w("ouvre ouvres ouvre ouvrons ouvrez ouvrent"), pp: "ouvert" },
    "courir":     { pres: w("cours cours court courons courez courent"), pp: "couru", fut: "courr" },
    "acheter":    { pres: w("achète achètes achète achetons achetez achètent"), fut: "achèter" },
    "manger":     { pres: w("mange manges mange mangeons mangez mangent") },
    "arriver":    { aux: "être" },
    "rester":     { aux: "être" }
  };

  const REGULAR_IR = ["finir", "choisir"];

  function info(inf) {
    const v = VERBS[inf] || {};
    let pres = v.pres;
    let pp = v.pp;
    if (!pres) {
      if (inf.endsWith("er")) {
        const s = inf.slice(0, -2);
        pres = [s + "e", s + "es", s + "e", s + "ons", s + "ez", s + "ent"];
        pp = pp || s + "é";
      } else if (REGULAR_IR.includes(inf)) {
        const s = inf.slice(0, -2);
        pres = [s + "is", s + "is", s + "it", s + "issons", s + "issez", s + "issent"];
        pp = pp || s + "i";
      } else if (inf.endsWith("re")) {
        const s = inf.slice(0, -2);
        pres = [s + "s", s + "s", s, s + "ons", s + "ez", s + "ent"];
        pp = pp || s + "u";
      } else {
        throw new Error("No conjugation data for " + inf);
      }
    }
    if (!pp) pp = inf.endsWith("er") ? inf.slice(0, -2) + "é" : null;
    if (!pp) throw new Error("No past participle for " + inf);

    const impStem = v.imparfait || pres[3].replace(/ons$/, "");
    const futStem = v.fut || (inf.endsWith("re") ? inf.slice(0, -1) : inf);
    return { inf, pres, pp, aux: v.aux || "avoir", impStem, futStem, subjOverride: v.subj, imp: v.imp };
  }

  // stem + ending, keeping the soft g (mangeais / mangions)
  function join(stem, ending) {
    if (stem.endsWith("ge") && /^[ie]/.test(ending)) return stem.slice(0, -1) + ending;
    return stem + ending;
  }

  const IMPF_END = ["ais", "ais", "ait", "ions", "iez", "aient"];
  const FUT_END = ["ai", "as", "a", "ons", "ez", "ont"];

  const forms = {
    present: v => v.pres,
    imparfait: v => IMPF_END.map(e => join(v.impStem, e)),
    futur: v => FUT_END.map(e => v.futStem + e),
    conditionnel: v => IMPF_END.map(e => v.futStem + e),
    subjonctif: v => {
      if (v.subjOverride) return v.subjOverride;
      const s = v.pres[5].replace(/ent$/, "");
      const impf = forms.imparfait(v);
      return [s + "e", s + "es", s + "e", impf[3], impf[4], s + "ent"];
    },
    imperatif: v => {
      if (v.imp === null) return null;
      if (v.imp) return v.imp;
      const tu = /(es|as)$/.test(v.pres[1]) ? v.pres[1].slice(0, -1) : v.pres[1];
      return [tu, v.pres[3], v.pres[4]];
    }
  };

  const startsWithVowel = s => /^[aeiouyàâäéèêëîïôöùûüh]/i.test(s);

  // "je" + "ai" -> "j'ai"
  function withPronoun(pronoun, rest) {
    if (pronoun === "je" && startsWithVowel(rest)) return "j'" + rest;
    return pronoun + " " + rest;
  }

  // être-verbs agree with the subject in compound tenses
  const AGREE = { je: "(e)", tu: "(e)", il: "", elle: "e", on: "(e)s", nous: "(e)s", vous: "(e)(s)", ils: "s", elles: "es" };

  function compound(pronoun, v, auxTense) {
    const aux = info(v.aux);
    const p = PERSON[pronoun];
    const auxForm = auxTense === "imparfait" ? forms.imparfait(aux)[p] : aux.pres[p];
    const part = v.aux === "être" ? v.pp + AGREE[pronoun] : v.pp;
    return withPronoun(pronoun, auxForm + " " + part);
  }

  function conjugate(pronoun, tense, inf) {
    if (!(pronoun in PERSON)) throw new Error("Unknown pronoun " + pronoun);
    const v = info(inf);
    const p = PERSON[pronoun];

    switch (tense) {
      case "présent":
        return { text: withPronoun(pronoun, v.pres[p]) };
      case "imparfait":
        return { text: withPronoun(pronoun, forms.imparfait(v)[p]) };
      case "futur simple":
        return { text: withPronoun(pronoun, forms.futur(v)[p]) };
      case "conditionnel":
        return { text: withPronoun(pronoun, forms.conditionnel(v)[p]) };
      case "passé composé":
        return { text: compound(pronoun, v, "présent") };
      case "plus-que-parfait":
        return { text: compound(pronoun, v, "imparfait") };
      case "futur proche":
        return { text: withPronoun(pronoun, info("aller").pres[p] + " " + inf) };
      case "passé récent": {
        const de = startsWithVowel(inf) ? "d'" + inf : "de " + inf;
        return { text: withPronoun(pronoun, info("venir").pres[p] + " " + de) };
      }
      case "subjonctif": {
        const form = forms.subjonctif(v)[p];
        const que = /^(il|elle|on|ils|elles)$/.test(pronoun) ? "qu'" + pronoun + " " + form
          : "que " + withPronoun(pronoun, form);
        return { text: que };
      }
      case "impératif": {
        const imp = forms.imperatif(v);
        if (!imp) return { text: null, note: `“${inf}” has no imperative form.` };
        const idx = { tu: 0, nous: 1, vous: 2 }[pronoun];
        if (idx === undefined) {
          return { text: null, note: "The imperative only exists for tu, nous and vous." };
        }
        const f = imp[idx];
        return { text: f.charAt(0).toUpperCase() + f.slice(1) + " !" };
      }
      default:
        throw new Error("Unknown tense " + tense);
    }
  }

  // Is there a real answer for this combination? (used to pick sensible spins)
  function exists(pronoun, tense, inf) {
    return conjugate(pronoun, tense, inf).text !== null;
  }

  const api = { conjugate, exists };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FG_CONJ = api;
})(typeof window !== "undefined" ? window : globalThis);
