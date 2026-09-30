/** Runnable Python examples for the playground (Pyodide: numpy, pandas, scikit-learn, scipy, matplotlib). */
export const SNIPPETS: { id: string; title: string; lesson: string; code: string }[] = [
  {
    id: "report",
    title: "classification_report on intent predictions",
    lesson: "classification-metrics",
    code: `from sklearn.metrics import classification_report, confusion_matrix

labels = ["interested", "not_interested", "insufficient_evidence"]
gold = ["interested","insufficient_evidence","not_interested","insufficient_evidence","interested",
        "not_interested","interested","interested","not_interested","interested",
        "insufficient_evidence","insufficient_evidence","not_interested","interested"]
pred = ["interested","interested","not_interested","interested","interested",
        "interested","interested","interested","not_interested","interested",
        "insufficient_evidence","interested","not_interested","not_interested"]

print(classification_report(gold, pred, labels=labels, digits=3, zero_division=0))
print("Confusion matrix (rows = gold, cols = pred):")
print(confusion_matrix(gold, pred, labels=labels))
`,
  },
  {
    id: "kappa",
    title: "Cohen's kappa vs raw agreement (and Fleiss)",
    lesson: "inter-annotator-agreement",
    code: `import numpy as np
from sklearn.metrics import cohen_kappa_score

a = ["INT"]*18 + ["NOT"]*2
b = ["INT"]*16 + ["NOT"]*2 + ["INT"]*2   # disagree on different items
raw = np.mean(np.array(a) == np.array(b))
print(f"raw agreement = {raw:.2f}")
print(f"Cohen's kappa = {cohen_kappa_score(a, b):.3f}   <- agreement beyond chance")

def fleiss_kappa(counts):
    """counts: items x categories matrix of how many raters chose each category."""
    counts = np.asarray(counts, dtype=float)
    N, k = counts.shape
    n = counts.sum(axis=1)[0]
    p_j = counts.sum(axis=0) / (N * n)
    P_i = (np.sum(counts**2, axis=1) - n) / (n * (n - 1))
    P_bar, P_e = P_i.mean(), np.sum(p_j**2)
    return (P_bar - P_e) / (1 - P_e)

# 5 calls x 3 categories, 4 annotators each
print("Fleiss kappa =", round(fleiss_kappa([[4,0,0],[2,2,0],[0,4,0],[1,1,2],[0,0,4]]), 3))
`,
  },
  {
    id: "calibration",
    title: "Reliability diagram with sklearn + matplotlib",
    lesson: "calibration",
    code: `import numpy as np
import matplotlib.pyplot as plt
from sklearn.calibration import calibration_curve

rng = np.random.default_rng(0)
true_p = rng.uniform(0.5, 1.0, 2000)          # true P(correct)
correct = rng.random(2000) < true_p
logit = np.log(true_p / (1 - true_p))
conf = 1 / (1 + np.exp(-2.2 * logit))          # an overconfident model

frac_pos, mean_pred = calibration_curve(correct, conf, n_bins=10)

# Expected Calibration Error: bin-weighted |accuracy - confidence|
bin_idx = np.clip((conf * 10).astype(int), 0, 9)
ece = sum(abs(correct[bin_idx == b].mean() - conf[bin_idx == b].mean()) * (bin_idx == b).mean()
          for b in range(10) if (bin_idx == b).any())
print(f"accuracy = {correct.mean():.3f}, mean confidence = {conf.mean():.3f}, ECE = {ece:.3f}")

plt.figure(figsize=(4.5, 4.5))
plt.plot([0, 1], [0, 1], "--", color="grey", label="perfect")
plt.plot(mean_pred, frac_pos, "o-", label="model")
plt.xlabel("mean predicted confidence"); plt.ylabel("fraction correct")
plt.title("Reliability diagram"); plt.legend()
`,
  },
  {
    id: "cluster",
    title: "TF-IDF + KMeans topic discovery with top terms",
    lesson: "clustering",
    code: `import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

docs = [
 "EMI is too high", "interest rate bahut zyada hai", "can you reduce the rate",
 "rate kam karo", "too many documents required", "documents bahut lagte hai",
 "paperwork is complicated", "call me next month", "abhi busy hu baad mein call karo",
 "after diwali I will think", "my CIBIL score is low", "salary below minimum income",
]
vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 4))
X = vec.fit_transform(docs)
km = KMeans(n_clusters=4, n_init=10, random_state=0).fit(X)

words = TfidfVectorizer().fit(docs)
for c in range(4):
    members = [d for d, l in zip(docs, km.labels_) if l == c]
    tf = words.transform([" ".join(members)]).toarray()[0]
    top = [words.get_feature_names_out()[i] for i in tf.argsort()[::-1][:3]]
    print(f"cluster {c}: {top}")
    for m in members: print("   -", m)
`,
  },
  {
    id: "slices",
    title: "Error analysis: F1 by slice with pandas",
    lesson: "error-analysis",
    code: `import numpy as np, pandas as pd
from sklearn.metrics import f1_score

rng = np.random.default_rng(1)
n = 800
df = pd.DataFrame({
    "agent": rng.choice(["A", "B", "C"], n),
    "quality": rng.choice(["clean", "noisy", "very noisy"], n, p=[0.55, 0.3, 0.15]),
    "gold": rng.random(n) < 0.3,
})
p_correct = df["quality"].map({"clean": 0.95, "noisy": 0.84, "very noisy": 0.68})
correct = rng.random(n) < p_correct
df["pred"] = np.where(correct, df["gold"], ~df["gold"] & (rng.random(n) < 0.6))

def f1(g): return f1_score(g["gold"], g["pred"], zero_division=0)
print("overall F1:", round(f1(df), 3))
print(df.groupby("quality").apply(f1, include_groups=False).round(3).rename("F1"))
print(df.groupby(["agent", "quality"]).apply(f1, include_groups=False).unstack().round(2))
`,
  },
  {
    id: "significance",
    title: "Is Prompt B really better? McNemar + bootstrap",
    lesson: "significance",
    code: `import numpy as np
from scipy.stats import binomtest

rng = np.random.default_rng(7)
n = 300
a_correct = rng.random(n) < 0.80
b_correct = np.where(rng.random(n) < 0.9, a_correct, rng.random(n) < 0.84)

b_only = int(np.sum(~a_correct & b_correct))   # B right, A wrong
a_only = int(np.sum(a_correct & ~b_correct))   # A right, B wrong
print(f"acc A = {a_correct.mean():.3f}, acc B = {b_correct.mean():.3f}")
print(f"discordant: A-only {a_only}, B-only {b_only}")
print("McNemar exact p =", round(binomtest(b_only, a_only + b_only, 0.5).pvalue, 4))

diffs = []
for _ in range(2000):
    idx = rng.integers(0, n, n)
    diffs.append(b_correct[idx].mean() - a_correct[idx].mean())
lo, hi = np.percentile(diffs, [2.5, 97.5])
print(f"paired bootstrap 95% CI for (B - A): [{lo:+.3f}, {hi:+.3f}]")
`,
  },
  {
    id: "fuzzy",
    title: "Fuzzy matching with difflib and Levenshtein",
    lesson: "fuzzy-matching",
    code: `from difflib import SequenceMatcher

def levenshtein(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (ca != cb)))
        prev = cur
    return prev[-1]

catalogue = ["personal loan", "home loan", "gold loan", "vehicle loan", "credit card"]
for mention in ["persnal lon", "hom loan", "hold on", "two wheeler loan", "credit crd"]:
    scored = sorted(((SequenceMatcher(None, mention, c).ratio(), c) for c in catalogue), reverse=True)
    best_score, best = scored[0]
    print(f"{mention:>18} -> {best:<14} ratio={best_score:.2f}  lev={levenshtein(mention, best)}")
`,
  },
];
