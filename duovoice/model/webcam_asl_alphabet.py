# webcam_asl_alphabet.py
"""
Real-time ASL Alphabet Recognition via Webcam.
Usage: python webcam_asl_alphabet.py [camera_index]
"""
import sys, os
# Suppress TensorFlow and Mediapipe logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import logging
logging.getLogger('absl').setLevel('ERROR')
import cv2
import mediapipe as mp
import numpy as np
import tensorflow as tf
import pickle
from collections import deque

# --- Parse optional camera index ---
cam_idx = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 0

# --- Load trained model and label encoder ---
model = tf.keras.models.load_model("asl_alphabet_mlp.h5")
with open("label_encoder.pkl", "rb") as f:
    le = pickle.load(f)

# --- Initialize MediaPipe Hands ---
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)
mp_drawing = mp.solutions.drawing_utils

# --- Helper to open webcam robustly ---
def open_camera(idx):
    # Try default backend
    cap = cv2.VideoCapture(idx)
    if cap.isOpened():
        return cap
    # Try AVFoundation on macOS
    cap = cv2.VideoCapture(idx, cv2.CAP_AVFOUNDATION)
    return cap if cap.isOpened() else None

cap = open_camera(cam_idx)
if not cap:
    print(f"Error: Could not open webcam (index {cam_idx}).")
    sys.exit(1)

# Optional: set resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# Buffer for smoothing predictions
hist_queue = deque(maxlen=5)

# --- Main loop ---
while True:
    ret, frame = cap.read()
    if not ret:
        continue  # skip frame if read failed

    # Flip for mirror view and convert to RGB
    img = cv2.flip(frame, 1)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Process frame with MediaPipe
    results = hands.process(img_rgb)
    predicted_letter = ""

    if results.multi_hand_landmarks:
        lm = results.multi_hand_landmarks[0]
        mp_drawing.draw_landmarks(img, lm, mp_hands.HAND_CONNECTIONS)

        # Flatten landmarks
        coords = [coord for p in lm.landmark for coord in (p.x, p.y, p.z)]
        x_input = np.array(coords, dtype=np.float32).reshape(1, -1)

        # Predict with MLP
        probs = model.predict(x_input, verbose=0)[0]
        cls = int(np.argmax(probs))
        conf = float(probs[cls])
        if conf > 0.7:
            letter = le.inverse_transform([cls])[0]
            hist_queue.append(letter)
            # Require majority in history
            if hist_queue.count(letter) >= 3:
                predicted_letter = letter
        else:
            hist_queue.clear()

    # Overlay prediction
    cv2.putText(
        img,
        f"Letter: {predicted_letter}",
        (10, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        2,
        (0, 255, 0),
        3,
        cv2.LINE_AA
    )

    cv2.imshow("ASL Alphabet Recognition", img)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Clean up
cap.release()
cv2.destroyAllWindows()
hands.close()
