from flask import Flask
from endpoints.run_code_endpoint import bp as run_code_bp
from endpoints.run_qiskit_endpoint import bp as run_qiskit_bp
from endpoints.run_qiskit_editor_endpoint import bp as run_qiskit_editor_bp
from endpoints.run_cirq_endpoint import bp as run_cirq_bp
from endpoints.run_qiskit_transpiler import bp as run_qiskit_transpiler_bp
from endpoints.run_qiskit_annealing_endpoint import bp as run_qiskit_annealing_bp
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(run_code_bp)
    app.register_blueprint(run_qiskit_bp)
    app.register_blueprint(run_cirq_bp)  
    app.register_blueprint(run_qiskit_transpiler_bp)
    app.register_blueprint(run_qiskit_editor_bp)
    app.register_blueprint(run_qiskit_annealing_bp)
    return app

if __name__ == '__main__':
    app = create_app()
    #app.run(debug=True, port=8080)
    app.run(host='0.0.0.0', debug=True, port=8081)
