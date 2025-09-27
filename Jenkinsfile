pipeline {
    agent any
    environment {
        DEVICE = 'emulator-5554'
        ANDROID_AVD = 'samsung_galaxy_s10_14.0'
        APK_URL = 'https://github.com/capysta2016/AppiumWSmobile/releases/download/V1.0.0/build-1758888993235.apk'
        APK_PATH = 'src/apps/app.apk'
        TESTS_CONTAINER_PATH = '/home/androidusr/appium-js-tests'
        NVM_DIR = '/home/androidusr/.nvm'
        NODE_VERSION = '22'
        APP_PACKAGE = 'com.fin.whiteswan'
        APP_ACTIVITY = 'com.fin.app.MainActivity'
    }
    stages {
        stage('Start Android Emulator') {
            steps {
                script {
                    sh 'docker system prune -a -f --volumes || true'
                    sh 'docker rm -f android-emulator || true'
                    sh '''
                        docker run --name android-emulator -d \
                            -p 5554:5554 -p 5555:5555 \
                            --device /dev/kvm \
                            --privileged \
                            --cap-add=SYS_ADMIN \
                            --cap-add=NET_ADMIN \
                            -e EMULATOR_DEVICE="Samsung Galaxy S10" \
                            budtmo/docker-android:emulator_14.0
                    '''
                    sleep 150
                    // --- Диагностика контейнера и хоста ---
                    sh '''
                        echo "Проверка статуса контейнера:"
                        docker ps -a | grep android-emulator || echo "Контейнер не найден"

                        echo "Проверка логов контейнера:"
                        docker logs android-emulator || echo "Нет логов"

                        echo "Проверка /dev/kvm на хосте:"
                        ls -la /dev/kvm || echo "/dev/kvm отсутствует"

                        echo "Проверка занятости портов:"
                        netstat -tuln | grep 5554 || echo "Порт 5554 свободен"
                        netstat -tuln | grep 5555 || echo "Порт 5555 свободен"

                        echo "Проверка свободной памяти и диска:"
                        free -h || echo "Нет информации о памяти"
                        df -h || echo "Нет информации о диске"
                    '''
                    sh '''
                        if ! docker ps | grep -q android-emulator; then
                            echo "❌ Container failed to start!"
                            docker logs android-emulator || echo "No logs available"
                            exit 1
                        fi
                    '''
                    sh '''
                        set +e
                        for i in {1..12}; do
                            echo "ADB devices check attempt $i"
                            DEVICES=$(docker exec android-emulator adb devices -l)
                            echo "Devices list: $DEVICES"
                            if echo "$DEVICES" | grep -q "emulator-5554.*device"; then
                                echo "✅ Device emulator-5554 found and ready!"
                                break
                            fi
                            sleep 10
                        done
                        if ! echo "$DEVICES" | grep -q "emulator-5554.*device"; then
                            echo "❌ Device emulator-5554 not found"
                            exit 1
                        fi
                    '''
                    timeout(time: 360, unit: 'SECONDS') {
                        sh '''
                            docker exec android-emulator adb -s ${DEVICE} wait-for-device
                            echo "Device ${DEVICE} is connected!"
                            for i in {1..30}; do
                                boot_status=$(docker exec android-emulator adb -s ${DEVICE} shell getprop sys.boot_completed 2>/dev/null || echo "")
                                if [ "$boot_status" = "1" ]; then
                                    echo "✅ System fully booted!"
                                    exit 0
                                else
                                    echo "Boot status: $boot_status - waiting... (attempt $i/30)"
                                    sleep 10
                                fi
                            done
                            echo "❌ Emulator failed to boot within 5 minutes"
                            exit 1
                        '''
                    }
                }
            }
        }
        stage('Setup Node.js in Container') {
            steps {
                sh '''
                    docker exec -u androidusr android-emulator sh -c "
                        export NVM_DIR=${NVM_DIR}
                        [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\" || {
                            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
                            . \"$NVM_DIR/nvm.sh\"
                        }
                        nvm install ${NODE_VERSION} || nvm use --delete-prefix v${NODE_VERSION}
                        nvm alias default ${NODE_VERSION}
                        node --version
                        npm --version
                    "
                '''
            }
        }
        stage('Download APK') {
            steps {
                dir('src/apps') {
                    sh '''
                        mkdir -p .
                        curl -f -L -o app.apk "$APK_URL"
                        SIZE=$(stat -c %s app.apk 2>/dev/null || ls -l app.apk | awk '{print $5}')
                        if [ "$SIZE" -lt 1024 ]; then
                            echo "❌ File is too small"
                            exit 1
                        fi
                    '''
                }
            }
        }
        stage('Copy APK to Container') {
            steps {
                sh '''
                    docker cp src/apps/app.apk android-emulator:/home/androidusr/app.apk
                    docker exec android-emulator ls -la /home/androidusr/app.apk
                '''
            }
        }
        stage('Install APK Inside Container') {
            steps {
                sh '''
                    docker exec android-emulator adb -s ${DEVICE} install -r /home/androidusr/app.apk
                    if [ $? -ne 0 ]; then
                        docker exec android-emulator adb -s ${DEVICE} install /home/androidusr/app.apk
                        if [ $? -ne 0 ]; then
                            exit 1
                        fi
                    fi
                '''
            }
        }
        stage('Verify APK Installation') {
            steps {
                sh '''
                    if docker exec android-emulator sh -c "adb -s ${DEVICE} shell pm list packages | grep -q '${APP_PACKAGE}'"; then
                        echo "✅ App installed"
                    else
                        docker exec android-emulator adb -s ${DEVICE} shell pm list packages | head -20
                        exit 1
                    fi
                '''
            }
        }
        stage('Copy APK to Test Directory') {
            steps {
                sh '''
                    docker exec android-emulator sh -c "mkdir -p /home/androidusr/appium-js-tests/apps/ && cp /home/androidusr/app.apk /home/androidusr/appium-js-tests/apps/my-app.apk && ls -la /home/androidusr/appium-js-tests/apps/"
                '''
            }
        }
        stage('Install Appium in Container') {
            steps {
                sh '''
                    docker exec -u androidusr android-emulator sh -c "export NVM_DIR=${NVM_DIR}; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; nvm use ${NODE_VERSION}; npm install -g appium@2.19.0"
                '''
            }
        }
        stage('Copy Tests to Container') {
            steps {
                sh '''
                    docker exec -u androidusr android-emulator mkdir -p /home/androidusr/appium-js-tests
                    tar -cf - src tests wdio.conf.ts package.json | docker exec -i -u androidusr android-emulator tar -xf - -C /home/androidusr/appium-js-tests/
                    docker exec -u androidusr android-emulator ls -la /home/androidusr/appium-js-tests/
                '''
            }
        }
        stage('Run Appium Tests') {
            steps {
                sh '''
                    docker exec -u androidusr -e ANDROID_AVD="${ANDROID_AVD}" android-emulator sh -c "cd /home/androidusr/appium-js-tests; export NVM_DIR=/home/androidusr/.nvm; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; nvm use 22; npm install --omit=optional --no-audit --no-fund --no-package-lock; export CI=true; npm run test || true"
                '''
            }
        }
        stage('Copy Allure Results from Container') {
            steps {
                sh '''
                    mkdir -p allure-results
                    docker cp android-emulator:/home/androidusr/appium-js-tests/allure-results/. allure-results/ || echo "⚠️ No allure-results found"
                    chmod -R 777 allure-results || true
                '''
            }
        }
    }
    post {
        always {
            sh '''
                docker stop android-emulator || true
                docker rm android-emulator || true
            '''
            archiveArtifacts artifacts: 'allure-results/**/*', allowEmptyArchive: true
            script {
                allure([
                    reportBuildPolicy: 'ALWAYS',
                    includeProperties: false,
                    results: [[path: 'allure-results']],
                    commandline: 'Allure_2.34'
                ])
            }
            script {
                def reportUrl = "${env.BUILD_URL}allure/"
                def telegramBotToken = "8159139872:AAFpWsYfMKZyDpvNCeLoPAYHwtxZARB5hNU"
                def telegramChatId = "-4929513612"
                def stats = [total: 0, passed: 0, failed: 0, skipped: 0, retried_passed: 0, retried_failed: 0]
                def resultsDir = 'allure-results'
                if (fileExists(resultsDir)) {
                    dir(resultsDir) {
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
${statusColor} *Результаты мобильных автотестов* ${statusIcon}

📌 *Основная информация:*
   • *Проект:* ${env.JOB_NAME} (мобильные)
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
                def encodedMessage = URLEncoder.encode(message, "UTF-8")
                sh """
                    curl -s -X POST \\
                    "https://api.telegram.org/bot${telegramBotToken}/sendMessage" \\
                    -d "chat_id=${telegramChatId}" \\
                    -d "text=${encodedMessage}" \\
                    -d "parse_mode=Markdown" \\
                    -d "disable_web_page_preview=false"
                """
            }
            cleanWs()
        }
    }
}