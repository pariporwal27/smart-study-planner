"""Machine learning utilities for the Smart Study Planner app."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split


FEATURE_COLUMNS = ["difficulty", "past_score", "days_left"]
TARGET_COLUMN = "recommended_hours"
FEATURE_LABELS = {
    "difficulty": "Difficulty",
    "past_score": "Past Score",
    "days_left": "Days Left",
}


@dataclass
class ModelBundle:
    """Stores trained models and their evaluation metrics."""

    linear_model: LinearRegression
    random_forest_model: RandomForestRegressor
    metrics: pd.DataFrame
    best_model_name: str

    @property
    def best_model(self):
        if self.best_model_name == "Random Forest":
            return self.random_forest_model
        return self.linear_model


def load_training_data(path: str = "data/sample_data.csv") -> pd.DataFrame:
    """Load the sample dataset used for model training."""
    return pd.read_csv(path)


def train_models(data: pd.DataFrame) -> ModelBundle:
    """Train Linear Regression and Random Forest models, then compare them."""
    x = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=42
    )

    linear_model = LinearRegression()
    linear_model.fit(x_train, y_train)

    random_forest_model = RandomForestRegressor(
        n_estimators=180,
        max_depth=8,
        min_samples_leaf=2,
        random_state=42,
    )
    random_forest_model.fit(x_train, y_train)

    metrics = _evaluate_models(
        {
            "Linear Regression": linear_model,
            "Random Forest": random_forest_model,
        },
        x_test,
        y_test,
    )
    best_model_name = metrics.sort_values(["MAE", "R2"], ascending=[True, False]).iloc[
        0
    ]["Model"]

    return ModelBundle(
        linear_model=linear_model,
        random_forest_model=random_forest_model,
        metrics=metrics,
        best_model_name=best_model_name,
    )


def predict_raw_hours(model, subject_inputs: list[dict]) -> np.ndarray:
    """Predict unnormalized study hours for each subject."""
    input_frame = pd.DataFrame(subject_inputs)
    predictions = model.predict(input_frame[FEATURE_COLUMNS])
    return np.clip(predictions, 0.25, None)


def normalize_predictions(predicted_hours: np.ndarray, total_available_hours: float) -> np.ndarray:
    """Scale model predictions so allocations sum to the user's daily time."""
    predicted_hours = np.asarray(predicted_hours, dtype=float)
    total_prediction = predicted_hours.sum()

    if total_prediction <= 0:
        return np.full(len(predicted_hours), total_available_hours / len(predicted_hours))

    normalized = predicted_hours / total_prediction * total_available_hours
    return np.round(normalized, 2)


def allocate_study_hours(
    model,
    subject_inputs: list[dict],
    total_available_hours: float,
) -> np.ndarray:
    """Predict and normalize daily study hours for all selected subjects."""
    raw_predictions = predict_raw_hours(model, subject_inputs)
    return normalize_predictions(raw_predictions, total_available_hours)


def get_random_forest_feature_importance(model_bundle: ModelBundle) -> pd.DataFrame:
    """Return Random Forest feature importance values for explainability."""
    importances = model_bundle.random_forest_model.feature_importances_
    importance_frame = pd.DataFrame(
        {
            "Feature": [FEATURE_LABELS[column] for column in FEATURE_COLUMNS],
            "Importance": importances,
        }
    )
    return importance_frame.sort_values("Importance", ascending=False)


def _evaluate_models(models: dict, x_test: pd.DataFrame, y_test: pd.Series) -> pd.DataFrame:
    """Return model comparison metrics for display in the dashboard."""
    rows = []
    for model_name, model in models.items():
        predictions = model.predict(x_test)
        rows.append(
            {
                "Model": model_name,
                "MAE": round(mean_absolute_error(y_test, predictions), 3),
                "R2": round(r2_score(y_test, predictions), 3),
            }
        )

    return pd.DataFrame(rows)
