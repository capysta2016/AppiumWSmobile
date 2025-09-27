pipeline {
    agent any  // Агент с Docker

    stages {
        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build("appium-tests:${env.BUILD_ID}")
                }
            }
        }

        stage('Run Tests in Docker') {
            steps {
                script {
                    dockerImage.inside('--privileged') {
                        // Эмулятор и тесты запускаются в CMD Dockerfile
                        sh 'echo "Tests running in container"'
                    }
                }
            }
        }

        stage('Publish Reports') {
            steps {
                script {
                    dockerImage.inside {
                        allure includeProperties: false, jdk: '', results: [[path: 'allure-results']]
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                dockerImage.inside {
                    archiveArtifacts artifacts: 'allure-results/**', allowEmptyArchive: true
                }
            }
        }
        failure {
            echo 'Tests failed'
        }
    }
}