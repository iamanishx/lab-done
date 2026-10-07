import pythonExample from "../examples/distance_measures.py?raw";
import outputExample from "../examples/distance_output.txt?raw";
export const PYTHON_SAMPLE = pythonExample;
export const OUTPUT_SAMPLE = outputExample;
export const MARKDOWN_SAMPLE = [
  "# Experiment: Distance measures",
  "",
  "## Aim",
  "To calculate distances between two points in the Iris dataset using Python.",
  "",
  "## Theory",
  "The Euclidean distance between points $p$ and $q$ is:",
  "",
  "$$",
  String.raw`d(p,q) = \sqrt{\sum_{i=1}^{n}(p_i-q_i)^2}`,
  "$$",
  "",
  String.raw`The Manhattan distance is $d(p,q)=\sum_{i=1}^{n}|p_i-q_i|$.`,
  "",
  "## Program",
  "",
  "```python",
  pythonExample.trimEnd(),
  "```",
  "",
  "## Result",
  "The program calculates Euclidean, Manhattan, Minkowski, Chebyshev, squared Euclidean, and cosine distances.",
].join("\n");
