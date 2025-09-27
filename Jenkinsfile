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
        // --- Отправка отчёта в Telegram ---
        def reportUrl = "${env.BUILD_URL}allure/"
    def telegramBotToken = "8159139872:AAFpWsYfMKZyDpvNCeLoPAYHwtxZARB5hNU"
    def telegramChatId = "-4929513612"
        def stats = [total: 0, passed: 0, failed: 0, skipped: 0, retried_passed: 0, retried_failed: 0]
        dir('allure-results') {
            def files = findFiles(glob: '**/*-result.json')
            def testCases = [:]
            files.each { file ->
                def content = readJSON file: file.path
                def testName = content.name ?: content.fullName ?: "Unknown"
                if (!testCases.containsKey(testName)) {
                    testCases[testName] = []
                }
                testCases[testName] << content
            }
            testCases.each { testName, results ->
                stats.total++
                def lastResult = results.last()
                if (results.size() == 1) {
                    switch(lastResult.status?.toLowerCase()) {
                        case 'passed': stats.passed++; break
                        case 'failed': stats.failed++; break
                        case 'skipped': stats.skipped++; break
                    }
                } else {
                    if (lastResult.status?.toLowerCase() == 'passed') {
                        stats.retried_passed++
                    } else {
                        stats.retried_failed++
                    }
                }
            }
            stats.passed += stats.retried_passed
            stats.failed += stats.retried_failed
            stats.retries = stats.retried_passed + stats.retried_failed
        }
        def successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 as int : 0
        def barLength = 20
        def filledBars = Math.round((successRate as double) / 5)
        def progressBar = "${'█' * filledBars}${'░' * (barLength - filledBars)}"
        def statusData = [
            'SUCCESS': ['УСПЕШНО', '✅', '🟢'],
            'FAILURE': ['ПРОВАЛЕНО', '❌', '🔴'],
            'UNSTABLE': ['НЕСТАБИЛЬНО', '⚠️', '🟡'],
            'ABORTED': ['ОТМЕНЕНО', '⏹️', '⚪']
        ]
        def (statusText, statusIcon, statusColor) = statusData[currentBuild.currentResult] ?: ['НЕИЗВЕСТНО', '❓', '⚫']
        def message = """
${statusColor} *Результаты автотестов* ${statusIcon}

📌 *Основная информация:*
   • *Проект:* ${env.JOB_NAME}
   • *Сборка:* #${env.BUILD_NUMBER}
   • *Статус:* _${statusText}_
   • *Длительность:* ${currentBuild.durationString.replace(' and counting', '')}

📊 *Статистика выполнения:*
`Успешные    : ${String.format("%3d", stats.passed)} (повтор: ${String.format("%2d", stats.retried_passed)})`
`Проваленные : ${String.format("%3d", stats.failed)} (повтор: ${String.format("%2d", stats.retried_failed)})`
`Пропущенные : ${String.format("%3d", stats.skipped)}`
`Повторные   : ${String.format("%3d", stats.retries)}`
`Всего       : ${String.format("%3d", stats.total)}`

📂 *Отчеты:*
   • [Allure Report](${reportUrl})
   • [Jenkins Build](${env.BUILD_URL})
"""
        def encodedMessage = java.net.URLEncoder.encode(message, "UTF-8")
        sh """
            curl -s -X POST \
            "https://api.telegram.org/bot${telegramBotToken}/sendMessage"  \
            -d "chat_id=${telegramChatId}" \
            -d "text=${encodedMessage}" \
            -d "parse_mode=Markdown" \
            -d "disable_web_page_preview=false"
        """
    }
        failure {
            echo 'Tests failed'
        }
    }
}