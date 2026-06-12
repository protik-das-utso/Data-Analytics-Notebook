/* Decision flows for the interactive Decision Assistant.
   Each flow is a small tree of question nodes ending in result nodes.
   Links point at the relevant chapter (and section anchor where stable).
   Node shapes:
     question -> { q, help?, opts:[{label, sub?, to}] }
     result   -> { result:true, title, detail (HTML), links:[{text,href,ghost?}] }
   Section anchors are slugs of the chapter section headings (see nav.js slugify).
*/
window.DECISIONS = [
{
  key: 'missing', icon: '🕳️', title: 'Handle missing values',
  desc: 'Choose the right way to fill or drop gaps in a column.',
  start: 'q1',
  nodes: {
    q1: { q: 'Where are the missing values?', help: 'Pick the column type you are dealing with.',
      opts: [
        { label: 'A numeric column', to: 'qnum' },
        { label: 'A categorical / text column', to: 'qcat' },
        { label: 'More than ~40% of the whole column is empty', sub: 'And it has little predictive value', to: 'rdrop' }
      ] },
    qnum: { q: 'How is that numeric column distributed?',
      opts: [
        { label: 'Roughly symmetric / normal', to: 'rmean' },
        { label: 'Skewed, or it has outliers', to: 'rmedian' },
        { label: 'It is a time series / ordered log', to: 'rffill' }
      ] },
    qcat: { q: 'Is the fact that a value is missing meaningful?',
      opts: [
        { label: 'No — just fill the typical value', to: 'rmode' },
        { label: 'Maybe — "missing" could itself be a signal', to: 'runknown' }
      ] },
    rmean: { result: true, title: 'Impute with the mean',
      detail: 'For symmetric numeric data the <code>mean</code> is a fair central value. Fit the imputer on the <strong>training set only</strong>, then transform train and test to avoid leakage.',
      links: [{ text: 'Cleaning chapter', href: 'chapters/04-data-cleaning.html' }, { text: 'Missing-value decision guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-1-missing-value-decision-guide' }] },
    rmedian: { result: true, title: 'Impute with the median',
      detail: 'The <code>median</code> is robust to skew and outliers, which would drag the mean. This is the safe default for most real-world numeric columns. Consider also adding a <code>was_missing</code> flag.',
      links: [{ text: 'Missing-value decision guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-1-missing-value-decision-guide' }, { text: 'Outlier guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-2-outlier-handling-guide', ghost: true }] },
    rffill: { result: true, title: 'Forward / backward fill',
      detail: 'Ordered data should be filled from real neighbouring values with <code>ffill()</code> / <code>bfill()</code>, not a global statistic. Never shuffle a time series before filling.',
      links: [{ text: 'Time series chapter', href: 'chapters/28-time-series-analysis-and-forecasting.html' }] },
    rmode: { result: true, title: 'Fill with the mode (most frequent)',
      detail: 'For a categorical column with one dominant value, impute the <code>mode</code>. Keep the category set intact and apply the same fill value learned on train to the test set.',
      links: [{ text: 'Encoding guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-3-encoding-selection-guide' }] },
    runknown: { result: true, title: 'Create a "Missing" category + flag',
      detail: 'Fill with a constant like <code>"Missing"</code> and add a binary <code>was_missing</code> column. This preserves the signal that the value was absent, which often matters (e.g. an unfilled form field).',
      links: [{ text: 'Feature engineering', href: 'chapters/06-feature-engineering.html' }, { text: 'Decision matrix', href: 'chapters/15-data-analytics-decision-matrix.html#15-1-missing-value-decision-guide', ghost: true }] },
    rdrop: { result: true, title: 'Drop the column',
      detail: 'A column that is mostly empty and weakly related to the target adds noise. Drop it — but first confirm the missingness is not itself the pattern you care about.',
      links: [{ text: 'Cleaning chapter', href: 'chapters/04-data-cleaning.html' }] }
  }
},
{
  key: 'outliers', icon: '📈', title: 'Deal with outliers',
  desc: 'Decide whether to remove, cap, transform, or keep extreme values.',
  start: 'q1',
  nodes: {
    q1: { q: 'What is this outlier?',
      opts: [
        { label: 'A data error', sub: 'Typo, wrong unit, impossible value', to: 'rfix' },
        { label: 'A genuine extreme value', to: 'qgoal' }
      ] },
    qgoal: { q: 'What are you using the data for?',
      opts: [
        { label: 'Describing / reporting', to: 'rkeep' },
        { label: 'A linear or distance-based model', sub: 'Linear/Logistic Reg, SVM, KNN, K-Means', to: 'rcap' },
        { label: 'A tree-based model', sub: 'Random Forest, XGBoost, LightGBM', to: 'rtree' }
      ] },
    rfix: { result: true, title: 'Remove or correct it',
      detail: 'Confirmed data-entry errors should be fixed or removed — they are noise, not signal. Document the change in your analysis log.',
      links: [{ text: 'Outlier guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-2-outlier-handling-guide' }] },
    rkeep: { result: true, title: 'Keep it, report separately',
      detail: 'For description, do not hide real extremes. Report them alongside robust summaries (median, IQR) so the story stays honest.',
      links: [{ text: 'EDA chapter', href: 'chapters/03-exploratory-data-analysis.html' }] },
    rcap: { result: true, title: 'Cap (winsorize) or log-transform',
      detail: 'Linear and distance models are sensitive to extremes. Cap values at a percentile (e.g. 1st/99th) or apply a <code>log</code> transform to right-skewed positive data. Use <code>RobustScaler</code> for scaling.',
      links: [{ text: 'Outlier guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-2-outlier-handling-guide' }, { text: 'Scaling guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-4-scaling-selection-guide', ghost: true }] },
    rtree: { result: true, title: 'Keep them as-is',
      detail: 'Tree models split on order, not magnitude, so they are naturally robust to outliers. No capping needed — and in fraud/anomaly work the outliers <strong>are</strong> the target.',
      links: [{ text: 'Model selection guide', href: 'chapters/17-machine-learning-model-selection-guide.html' }] }
  }
},
{
  key: 'encoding', icon: '🏷️', title: 'Encode categorical variables',
  desc: 'Turn text categories into numbers the right way.',
  start: 'q1',
  nodes: {
    q1: { q: 'Does the category have a natural order?',
      opts: [
        { label: 'Yes — ordered', sub: 'low < medium < high', to: 'rordinal' },
        { label: 'No — unordered (nominal)', to: 'qcard' }
      ] },
    qcard: { q: 'How many distinct categories are there?',
      opts: [
        { label: 'Few (under ~15)', to: 'ronehot' },
        { label: 'Many (zip, city, product id)', to: 'qmodel' }
      ] },
    qmodel: { q: 'Which model will use it?',
      opts: [
        { label: 'A linear / generic model', to: 'rtarget' },
        { label: 'A gradient-boosted tree', sub: 'LightGBM / CatBoost', to: 'rnative' }
      ] },
    rordinal: { result: true, title: 'Ordinal / label encoding',
      detail: 'Map the ordered categories to integers that respect the order. Only do this when the order is real — fake order misleads linear models.',
      links: [{ text: 'Encoding guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-3-encoding-selection-guide' }] },
    ronehot: { result: true, title: 'One-Hot encoding',
      detail: 'Use <code>OneHotEncoder(handle_unknown="ignore")</code>. Clean and safe for low-cardinality nominal columns; just watch for column explosion as categories grow.',
      links: [{ text: 'Encoding guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-3-encoding-selection-guide' }] },
    rtarget: { result: true, title: 'Target / frequency encoding',
      detail: 'For high cardinality, encode each category by the target mean — but use <strong>K-fold cross-fitting</strong> or you will leak the target. Frequency encoding is a simpler, leak-free alternative.',
      links: [{ text: 'Encoding guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-3-encoding-selection-guide' }, { text: 'Data leakage guide', href: 'chapters/20-data-leakage-prevention-guide.html', ghost: true }] },
    rnative: { result: true, title: 'Native categorical handling',
      detail: 'CatBoost and LightGBM handle high-cardinality categories internally — pass the column as categorical and skip manual encoding entirely.',
      links: [{ text: 'Model selection guide', href: 'chapters/17-machine-learning-model-selection-guide.html' }] }
  }
},
{
  key: 'scaling', icon: '📏', title: 'Scale features',
  desc: 'Find out if you need scaling and which scaler to use.',
  start: 'q1',
  nodes: {
    q1: { q: 'Which model are you feeding?',
      opts: [
        { label: 'Distance / gradient based', sub: 'Linear, Logistic, SVM, KNN, K-Means, NN, PCA', to: 'qdist' },
        { label: 'Tree based', sub: 'Decision Tree, Random Forest, XGBoost', to: 'rnone' }
      ] },
    qdist: { q: 'What does the data look like?',
      opts: [
        { label: 'Has outliers', to: 'rrobust' },
        { label: 'Roughly normal, clean', to: 'rstandard' },
        { label: 'Needs a bounded [0,1] range', sub: 'Neural nets, image pixels', to: 'rminmax' }
      ] },
    rnone: { result: true, title: 'No scaling required',
      detail: 'Tree models split on thresholds, so feature magnitude does not matter. Scaling adds no value — skip it.',
      links: [{ text: 'Scaling guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-4-scaling-selection-guide' }] },
    rrobust: { result: true, title: 'RobustScaler',
      detail: 'Centres on the median and scales by the IQR, so a few extreme values do not distort everything else. Fit on train only.',
      links: [{ text: 'Scaling guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-4-scaling-selection-guide' }] },
    rstandard: { result: true, title: 'StandardScaler',
      detail: 'Zero mean, unit variance — the default for roughly-normal features without heavy outliers. Remember: <code>fit</code> on training data, then <code>transform</code> test data.',
      links: [{ text: 'Scaling guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-4-scaling-selection-guide' }, { text: 'Data leakage guide', href: 'chapters/20-data-leakage-prevention-guide.html', ghost: true }] },
    rminmax: { result: true, title: 'MinMaxScaler',
      detail: 'Squashes features into [0,1]. Ideal when a bounded range is required (e.g. neural network inputs) — but outliers will compress the rest of the data.',
      links: [{ text: 'Scaling guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-4-scaling-selection-guide' }] }
  }
},
{
  key: 'metric', icon: '🎯', title: 'Pick an evaluation metric',
  desc: 'Choose the metric that matches the business cost of being wrong.',
  start: 'q1',
  nodes: {
    q1: { q: 'What kind of problem is it?',
      opts: [
        { label: 'Classification', sub: 'Predicting a category', to: 'qclass' },
        { label: 'Regression', sub: 'Predicting a number', to: 'qreg' }
      ] },
    qclass: { q: 'Are the classes balanced?',
      opts: [
        { label: 'Yes, roughly balanced', to: 'racc' },
        { label: 'No — one class is rare', to: 'qcost' }
      ] },
    qcost: { q: 'Which mistake is more expensive?',
      opts: [
        { label: 'Missing a positive (false negative)', sub: 'Fraud, disease', to: 'rrecall' },
        { label: 'A false alarm (false positive)', sub: 'Spam filter blocking good mail', to: 'rprec' },
        { label: 'Both matter / need overall quality', to: 'rf1' }
      ] },
    qreg: { q: 'How should errors be weighted?',
      opts: [
        { label: 'Big errors must be punished hard', to: 'rrmse' },
        { label: 'Robust to outliers / equal weight', to: 'rmae' },
        { label: 'I need a % error for forecasting', to: 'rmape' }
      ] },
    racc: { result: true, title: 'Accuracy',
      detail: 'With balanced classes, accuracy is honest and easy to communicate. Avoid it the moment one class dominates.',
      links: [{ text: 'Metric selection guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-6-metric-selection-guide' }, { text: 'Model evaluation', href: 'chapters/10-model-evaluation.html', ghost: true }] },
    rrecall: { result: true, title: 'Recall (+ watch precision)',
      detail: 'Recall maximises caught positives — right when a miss is dangerous. Track the precision/recall trade-off and tune the decision threshold accordingly.',
      links: [{ text: 'Imbalanced learning', href: 'chapters/30-imbalanced-learning.html' }, { text: 'Metric guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-6-metric-selection-guide', ghost: true }] },
    rprec: { result: true, title: 'Precision',
      detail: 'Precision minimises false alarms — right when acting on a positive is costly or annoying. Pair it with recall so you see what you sacrifice.',
      links: [{ text: 'Imbalanced learning', href: 'chapters/30-imbalanced-learning.html' }] },
    rf1: { result: true, title: 'F1 / PR-AUC',
      detail: 'For imbalanced data needing overall quality, use <code>F1</code> (balance of precision & recall) or <code>PR-AUC</code> for ranking quality. PR-AUC beats ROC-AUC when positives are very rare.',
      links: [{ text: 'Imbalanced learning', href: 'chapters/30-imbalanced-learning.html' }, { text: 'Model evaluation', href: 'chapters/10-model-evaluation.html', ghost: true }] },
    rrmse: { result: true, title: 'RMSE',
      detail: 'Squares errors before averaging, so large misses dominate. Use when a big error is much worse than several small ones.',
      links: [{ text: 'Metric selection guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-6-metric-selection-guide' }] },
    rmae: { result: true, title: 'MAE',
      detail: 'Mean absolute error treats every unit of error equally and is robust to outliers. The most interpretable regression metric ("off by X on average").',
      links: [{ text: 'Metric selection guide', href: 'chapters/15-data-analytics-decision-matrix.html#15-6-metric-selection-guide' }] },
    rmape: { result: true, title: 'MAPE',
      detail: 'Mean absolute percentage error gives a scale-free "% off" figure stakeholders understand — but it blows up near zero values. Avoid it when actuals can be 0.',
      links: [{ text: 'Time series chapter', href: 'chapters/28-time-series-analysis-and-forecasting.html' }] }
  }
},
{
  key: 'model', icon: '🤖', title: 'Choose an ML model',
  desc: 'Match your target and constraints to the right algorithm.',
  start: 'q1',
  nodes: {
    q1: { q: 'What are you trying to do?',
      opts: [
        { label: 'Predict a category', sub: 'Classification', to: 'qpriority' },
        { label: 'Predict a number', sub: 'Regression', to: 'qpriority' },
        { label: 'Find groups with no labels', sub: 'Clustering', to: 'rcluster' },
        { label: 'Work with text or images', to: 'rdl' }
      ] },
    qpriority: { q: 'What matters most for this project?',
      opts: [
        { label: 'Best possible accuracy on tabular data', to: 'rgbm' },
        { label: 'Explaining every prediction to stakeholders', to: 'rinterp' },
        { label: 'A fast, simple baseline first', to: 'rbaseline' }
      ] },
    rgbm: { result: true, title: 'Gradient-boosted trees',
      detail: 'XGBoost, LightGBM or CatBoost are the go-to winners for tabular data: strong accuracy, handle mixed types, need no scaling. Pair with SHAP if you later need explanations.',
      links: [{ text: 'Model selection guide', href: 'chapters/17-machine-learning-model-selection-guide.html' }, { text: 'Interpretability', href: 'chapters/32-model-interpretability-and-explainability.html', ghost: true }] },
    rinterp: { result: true, title: 'Linear / Logistic Regression or a single tree',
      detail: 'When you must justify decisions (credit, healthcare, regulation), a linear model gives signed coefficients and a shallow decision tree gives readable rules. Accept a little accuracy for trust.',
      links: [{ text: 'Model selection guide', href: 'chapters/17-machine-learning-model-selection-guide.html' }, { text: 'Interpretability', href: 'chapters/32-model-interpretability-and-explainability.html', ghost: true }] },
    rbaseline: { result: true, title: 'Start with a simple baseline',
      detail: 'Begin with Logistic / Linear Regression (or a Decision Tree). It is fast, hard to get wrong, and gives a score every fancier model must beat. Many problems never need more.',
      links: [{ text: 'ML basics', href: 'chapters/09-machine-learning-basics.html' }, { text: 'Model selection guide', href: 'chapters/17-machine-learning-model-selection-guide.html', ghost: true }] },
    rcluster: { result: true, title: 'Clustering (K-Means / DBSCAN)',
      detail: 'No labels means unsupervised learning. K-Means for roughly spherical groups (choose k with the elbow/silhouette), DBSCAN when clusters are odd-shaped or you expect noise.',
      links: [{ text: 'Unsupervised learning', href: 'chapters/31-unsupervised-learning-clustering-and-dimensionality-reduction.html' }] },
    rdl: { result: true, title: 'Deep learning / transformers',
      detail: 'Unstructured text and images are where neural networks shine. Prefer transfer learning (a pre-trained model fine-tuned on your data) over training from scratch.',
      links: [{ text: 'Deep learning', href: 'chapters/34-deep-learning-fundamentals.html' }, { text: 'NLP fundamentals', href: 'chapters/33-nlp-fundamentals.html', ghost: true }] }
  }
},
{
  key: 'stattest', icon: '🧪', title: 'Select a statistical test',
  desc: 'Answer what you want to know and get the correct test.',
  start: 'q1',
  nodes: {
    q1: { q: 'What do you want to find out?',
      opts: [
        { label: 'Compare a number between 2 groups', to: 'qpair' },
        { label: 'Compare a number across 3+ groups', to: 'ranova' },
        { label: 'Relationship between two numbers', to: 'rcorr' },
        { label: 'Association between two categories', to: 'rchi2' }
      ] },
    qpair: { q: 'Are the two groups independent, and roughly normal?',
      opts: [
        { label: 'Independent & roughly normal', to: 'rttest' },
        { label: 'Paired (same subjects twice)', to: 'rpaired' },
        { label: 'Not normal / small / ordinal', to: 'rmann' }
      ] },
    rttest: { result: true, title: "Independent two-sample t-test",
      detail: 'Compares two group means. Check roughly-normal data and similar variances (use Welch’s t-test if variances differ). Its non-parametric backup is Mann–Whitney U.',
      links: [{ text: 'Stat test selection guide', href: 'chapters/16-statistical-test-selection-guide.html' }, { text: 'Statistics foundations', href: 'chapters/23-probability-and-statistics-foundations.html', ghost: true }] },
    rpaired: { result: true, title: 'Paired t-test',
      detail: 'Use when the same units are measured twice (before/after). It tests the mean of the differences. Non-parametric backup: Wilcoxon signed-rank.',
      links: [{ text: 'Stat test selection guide', href: 'chapters/16-statistical-test-selection-guide.html' }] },
    rmann: { result: true, title: 'Mann–Whitney U test',
      detail: 'The distribution-free alternative to the t-test for two independent groups — right for skewed, small, or ordinal data. It compares ranks, not means.',
      links: [{ text: 'Stat test selection guide', href: 'chapters/16-statistical-test-selection-guide.html' }] },
    ranova: { result: true, title: 'ANOVA (or Kruskal–Wallis)',
      detail: 'One-way ANOVA compares means across 3+ groups; if normality fails use the non-parametric Kruskal–Wallis. A significant result needs a post-hoc test to see which groups differ.',
      links: [{ text: 'Stat test selection guide', href: 'chapters/16-statistical-test-selection-guide.html' }] },
    rcorr: { result: true, title: 'Pearson or Spearman correlation',
      detail: 'Pearson for a linear relationship between two roughly-normal numbers; Spearman (rank-based) when the link is monotonic but not linear, or data is skewed.',
      links: [{ text: 'Stat test selection guide', href: 'chapters/16-statistical-test-selection-guide.html' }, { text: 'Statistics foundations', href: 'chapters/23-probability-and-statistics-foundations.html', ghost: true }] },
    rchi2: { result: true, title: 'Chi-square test of independence',
      detail: 'Tests whether two categorical variables are associated, using a contingency table. Use Fisher’s exact test instead when expected counts in cells are very small (<5).',
      links: [{ text: 'Stat test selection guide', href: 'chapters/16-statistical-test-selection-guide.html' }] }
  }
}
];
