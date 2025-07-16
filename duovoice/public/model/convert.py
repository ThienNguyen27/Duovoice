import tensorflow as tf
import tensorflowjs as tfjs


model = tf.keras.models.load_model("asl_alphabet_mlp.h5")

tfjs.converters.save_keras_model(model, "model/asl_model")
