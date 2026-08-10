import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

# Synthetic dataset of safe vs scam texts (Indian context)
data = [
    # SAFE
    ("Hi mom, I will be home by 9 PM.", 0),
    ("Please find the attached project report for Q3.", 0),
    ("The meeting has been rescheduled to 4 PM IST tomorrow.", 0),
    ("Can you send me the recipe for paneer butter masala?", 0),
    ("Let's plan a trip to Goa this December.", 0),
    ("Your order from Amazon has been delivered.", 0),
    ("Happy Diwali to you and your family!", 0),
    ("Don't forget to pay the electricity bill.", 0),
    ("I transferred Rs 500 for the dinner last night.", 0),
    ("Just checking in, hope you're doing well.", 0),
    
    # SCAMS
    ("URGENT: Your bank account will be blocked today. Click here to update KYC.", 1),
    ("Congratulations! You have won Rs 50,00,000 in the Jio Lucky Draw. Pay processing fee now.", 1),
    ("Police notice: You are under digital arrest for money laundering. Do not disconnect.", 1),
    ("Double your crypto in 24 hours. Connect your wallet to receive free airdrop.", 1),
    ("CBI alert: A parcel with your name containing illegal goods was seized.", 1),
    ("Work from home job: Earn Rs 5000 per day by liking YouTube videos. Deposit training fee.", 1),
    ("Dear customer, your PAN is deactivated. Share OTP to link Aadhaar immediately.", 1),
    ("Your electricity connection will be cut at 9:30 PM. Call this number now.", 1),
    ("I am stuck at customs with a gift for you. Please transfer clearance fee.", 1),
    ("Send money to this UPI ID immediately to unlock your cashback reward.", 1),
]

texts, labels = zip(*data)

# Pipeline: TF-IDF -> Random Forest
vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=1000)
rf_model = RandomForestClassifier(n_estimators=50, random_state=42)

print("Training model...")
X = vectorizer.fit_transform(texts)
rf_model.fit(X, labels)
print(f"Training accuracy: {rf_model.score(X, labels):.2f}")

# Save the models
os.makedirs("netra/pipeline/models", exist_ok=True)
joblib.dump(vectorizer, "netra/pipeline/models/tfidf_vectorizer.pkl")
joblib.dump(rf_model, "netra/pipeline/models/scam_rf_model.pkl")

print("Successfully saved models to netra/pipeline/models/")
