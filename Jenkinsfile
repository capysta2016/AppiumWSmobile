pipeline {
    agent any
    parameters {
        string(name: 'STAGE_COUNT', defaultValue: '1', description: 'How many stages to run sequentially (1 = Start Emulator)')
        string(name: 'MIN_AVAILABLE_GB', defaultValue: '20', description: 'Minimum free space on / (GB) required to proceed with emulator pulls')
        booleanParam(name: 'SKIP_PREFLIGHT', defaultValue: false, description: 'If true, skip the preflight disk check (use with caution)')
    }
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
        stage('Preflight: Disk & Docker checks') {
            // run this stage only when STAGE_COUNT == '0' (preflight-only run) OR when explicitly not skipped
            when {
                expression { return params.STAGE_COUNT == '0' }
            }
            steps {
                script {
                    sh '''
                        echo "--- Preflight checks: host disk and docker usage ---"
                        echo "Date: $(date)"
                        echo "Filesystem usage (df -h):"
                        df -h || true
                        echo "Docker storage summary:"
                        docker system df || true
                        echo "Docker info (limited):"
                        docker info --format '{{.Driver}} driver, Images={{.Images}}, Containers={{.Containers}}' || true
                        echo "Size of /var/lib/docker/overlay2 (if exists):"
                        du -sh /var/lib/docker/overlay2 2>/dev/null || echo "/var/lib/docker/overlay2 not present or inaccessible"

                        # check available space on filesystem hosting /var/lib/docker (or /)
                        avail_kb=$(df --output=avail -k / | tail -1)
                        # min GB threshold is configurable via pipeline parameter MIN_AVAILABLE_GB (default 20GB)
                        min_gb=${MIN_AVAILABLE_GB:-20}
                        min_kb=$((min_gb * 1024 * 1024))
                        echo "Available KB on /: $avail_kb (minimum required: $min_kb -> ${min_gb}GB)"
                        if [ "${SKIP_PREFLIGHT}" = 'true' ] || [ "${SKIP_PREFLIGHT}" = '1' ]; then
                            echo "⚠️ SKIP_PREFLIGHT is set — skipping disk free space enforcement (proceed at your own risk)"
                        else
                            if [ "${avail_kb:-0}" -lt "${min_kb}" ]; then
                                echo "❌ Not enough free disk space. At least ${min_gb}GB free is recommended for emulator images."
                                exit 1
                            fi
                        fi
                        echo "✅ Preflight checks passed"
                    '''
                }
            }
        }
        stage('Start Android Emulator') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 1 }
            }
            steps {
                script {
                    sh '''
                        set -eu
                        docker system prune -a -f --volumes || true
                        docker rm -f android-emulator || true

                        # build docker run options dynamically depending on host devices
                        # Note: do NOT include quoted env values inside DOCKER_OPTS to avoid word-splitting
                        DOCKER_OPTS="-d --name android-emulator --privileged --cap-add=SYS_ADMIN --cap-add=NET_ADMIN -p 5554:5554 -p 5555:5555 -p 4723:4723"

                        if [ -e /dev/kvm ]; then
                            echo "[CI] /dev/kvm present -> enabling KVM passthrough"
                            DOCKER_OPTS="$DOCKER_OPTS --device /dev/kvm"
                        else
                            echo "[CI] /dev/kvm not present -> will not enable KVM"
                        fi

                        if [ -e /dev/dri/card0 ]; then
                            echo "[CI] /dev/dri present -> enabling GPU passthrough"
                            DOCKER_OPTS="$DOCKER_OPTS --device /dev/dri --group-add video"
                        else
                            echo "[CI] /dev/dri not present -> skipping GPU passthrough"
                        fi

                        echo "[CI] Docker run opts: $DOCKER_OPTS"

                        # First attempt: try with detected devices. Pass environment variables explicitly to avoid shell splitting.
                        # Ensure /dev/kvm and /dev/dri are explicitly passed to the container (if present on host)
                        docker run $DOCKER_OPTS -v "${WORKSPACE}/ci/supervisor/log_web_shared.override.conf:/etc/supervisor/conf.d/log_web_shared.override.conf:ro" --device /dev/kvm:/dev/kvm --device /dev/dri:/dev/dri --group-add video -e EMULATOR_DEVICE="Samsung Galaxy S10" -e APPIUM=1 -e WEB_VNC=1 budtmo/docker-android:emulator_14.0 || true

                        # give container a bit of time to initialize
                        sleep 30

                        echo "--- Диагностика контейнера и хоста (после первого старта) ---"
                        docker ps -a | grep android-emulator || echo "Контейнер не найден"
                        echo "--- Last container logs (tail 200) ---"
                        docker logs --tail 200 android-emulator || echo "No logs yet"
                        echo "--- Проверка /dev/kvm на хосте ---"
                        ls -la /dev/kvm || echo "/dev/kvm отсутствует"
                        echo "--- Проверка занятости портов ---"
                        netstat -tuln | egrep "5554|5555|4723" || true
                        echo "--- Проверка свободной памяти и диска ---"
                        free -h || true
                        df -h || true

                        # if container isn't running, collect logs and retry in fallback mode without KVM/DRI
                        if ! docker ps --filter "name=android-emulator" --filter "status=running" | grep -q android-emulator; then
                            echo "[CI] Initial container run failed or stopped. Collecting logs..."
                            mkdir -p ${WORKSPACE}/android-debug-logs || true
                            docker logs --timestamps --details android-emulator > ${WORKSPACE}/android-debug-logs/android-emulator-logs.first.txt 2>&1 || true
                            docker cp android-emulator:/home/androidusr/logs ${WORKSPACE}/android-debug-logs/ || true
                            docker cp android-emulator:/var/log ${WORKSPACE}/android-debug-logs/ || true

                            echo "[CI] Attempting fallback: restart without /dev/kvm and /dev/dri"
                            docker rm -f android-emulator || true
                            # Fallback run: explicit devices removed from DOCKER_OPTS earlier; ensure fallback intentionally omits /dev/kvm and /dev/dri
                            docker run -d --name android-emulator --privileged -v "${WORKSPACE}/ci/supervisor/log_web_shared.override.conf:/etc/supervisor/conf.d/log_web_shared.override.conf:ro" -p 5554:5554 -p 5555:5555 -p 4723:4723 -e EMULATOR_DEVICE="Samsung Galaxy S10" -e APPIUM=1 -e WEB_VNC=1 budtmo/docker-android:emulator_14.0 || true
                            sleep 30
                            echo "--- Logs after fallback start ---"
                            docker logs --tail 200 android-emulator || true
                            if ! docker ps --filter "name=android-emulator" --filter "status=running" | grep -q android-emulator; then
                                echo "[CI] Fallback also failed. Collecting final logs and failing the stage."
                                docker logs --timestamps --details android-emulator > ${WORKSPACE}/android-debug-logs/android-emulator-logs.fallback.txt 2>&1 || true
                                docker cp android-emulator:/home/androidusr/logs ${WORKSPACE}/android-debug-logs/ || true
                                docker cp android-emulator:/var/log ${WORKSPACE}/android-debug-logs/ || true
                                ls -la ${WORKSPACE}/android-debug-logs || true
                                exit 1
                            else
                                echo "[CI] Fallback succeeded; container is running without KVM/DRI"
                            fi
                        else
                            echo "[CI] Container is running (initial attempt succeeded)"
                        fi
                    '''
                    sh '''
                        set +e
                        for i in $(seq 1 12); do
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
                            for i in $(seq 1 30); do
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
                    // compact post-checks for this stage
                    sh '''
                        echo "--- Stage end checks: Start Android Emulator ---"
                        docker ps | grep android-emulator || echo "Container android-emulator not running"
                        echo "--- Last container logs (200 lines) ---"
                        docker logs --tail 200 android-emulator || true
                        echo "--- ADB devices ---"
                        docker exec android-emulator adb devices -l || true
                        echo "--- List test dir inside container ---"
                        docker exec android-emulator ls -la /home/androidusr/appium-js-tests || true
                    '''
                }
            }
        }
        stage('Setup Node.js in Container') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 2 }
            }
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
                // compact post-checks for this stage
                sh '''
                    echo "--- Stage end checks: Setup Node.js ---"
                    docker exec android-emulator node --version || true
                    docker exec android-emulator npm --version || true
                    docker exec android-emulator ps aux | head -20 || true
                '''
            }
        }
        stage('Download APK') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 3 }
            }
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
                    // compact post-checks for this stage
                    sh '''
                        echo "--- Stage end checks: Download APK ---"
                        ls -l src/apps || true
                        file src/apps/app.apk || true
                        sha256sum src/apps/app.apk || true
                    '''
                }
            }
        }
        stage('Copy APK to Container') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 4 }
            }
            steps {
                sh '''
                    docker cp src/apps/app.apk android-emulator:/home/androidusr/app.apk
                    docker exec android-emulator ls -la /home/androidusr/app.apk
                '''
                // compact post-checks for this stage
                sh '''
                    echo "--- Stage end checks: Copy APK to Container ---"
                    docker exec android-emulator ls -la /home/androidusr/app.apk || true
                    docker exec android-emulator file /home/androidusr/app.apk || true
                    docker exec android-emulator md5sum /home/androidusr/app.apk || true
                '''
            }
        }
        stage('Install APK Inside Container') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 5 }
            }
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
                // compact post-checks for this stage
                sh '''
                    echo "--- Stage end checks: Install APK Inside Container ---"
                    docker exec android-emulator adb -s ${DEVICE} shell pm list packages | grep ${APP_PACKAGE} || true
                    docker exec android-emulator adb -s ${DEVICE} shell dumpsys package ${APP_PACKAGE} | head -30 || true
                '''
            }
        }
        stage('Verify APK Installation') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 6 }
            }
            steps {
                sh '''
                    if docker exec android-emulator sh -c "adb -s ${DEVICE} shell pm list packages | grep -q '${APP_PACKAGE}'"; then
                        echo "✅ App installed"
                    else
                        docker exec android-emulator adb -s ${DEVICE} shell pm list packages | head -20
                        exit 1
                    fi
                '''
                // compact post-checks for this stage
                sh '''
                    echo "--- Stage end checks: Verify APK Installation ---"
                    docker exec android-emulator adb -s ${DEVICE} shell pm list packages | grep ${APP_PACKAGE} || true
                    docker exec android-emulator adb -s ${DEVICE} shell pm path ${APP_PACKAGE} || true
                '''
            }
        }
        stage('Copy APK to Test Directory') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 7 }
            }
            steps {
                sh '''
                    docker exec android-emulator sh -c "mkdir -p /home/androidusr/appium-js-tests/apps/ && cp /home/androidusr/app.apk /home/androidusr/appium-js-tests/apps/my-app.apk && ls -la /home/androidusr/appium-js-tests/apps/"
                '''
                // compact post-checks for this stage
                sh '''
                    echo "--- Stage end checks: Copy APK to Test Directory ---"
                    docker exec android-emulator ls -la /home/androidusr/appium-js-tests/apps || true
                    docker exec android-emulator ls -la /home/androidusr/appium-js-tests/apps/my-app.apk || true
                '''
            }
        }
        stage('Install Appium in Container') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 8 }
            }
            steps {
                sh '''
                    docker exec -u androidusr android-emulator sh -c "export NVM_DIR=${NVM_DIR}; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; nvm use ${NODE_VERSION}; npm install -g appium@2.19.0"
                '''
                // compact post-checks for this stage
                sh '''
                    echo "--- Stage end checks: Install Appium in Container ---"
                    docker exec -u androidusr android-emulator which appium || docker exec -u androidusr android-emulator npm list -g --depth=0 || true
                    docker exec -u androidusr android-emulator appium --version || true
                '''
            }
        }
        stage('Copy Tests to Container') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 9 }
            }
            steps {
                sh '''
                    docker exec -u androidusr android-emulator mkdir -p /home/androidusr/appium-js-tests
                    tar -cf - src tests wdio.conf.ts package.json | docker exec -i -u androidusr android-emulator tar -xf - -C /home/androidusr/appium-js-tests/
                    docker exec -u androidusr android-emulator ls -la /home/androidusr/appium-js-tests/
                '''
                // compact post-checks for this stage
                sh '''
                    echo "--- Stage end checks: Copy Tests to Container ---"
                    docker exec -u androidusr android-emulator ls -la /home/androidusr/appium-js-tests | head -50 || true
                    docker exec -u androidusr android-emulator node -v || true
                '''
            }
        }
        stage('Run Appium Tests') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 10 }
            }
            steps {
                sh '''
                    docker exec -u androidusr -e ANDROID_AVD="${ANDROID_AVD}" android-emulator sh -c "cd /home/androidusr/appium-js-tests; export NVM_DIR=/home/androidusr/.nvm; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; nvm use 22; npm install --omit=optional --no-audit --no-fund --no-package-lock; export CI=true; npm run test || true"
                '''
                // compact post-checks for this stage
                sh '''
                    echo "--- Stage end checks: Run Appium Tests ---"
                    docker exec -u androidusr android-emulator ls -la /home/androidusr/appium-js-tests/allure-results || echo "No allure-results dir"
                    docker exec -u androidusr android-emulator tail -n 200 /home/androidusr/appium-js-tests/logs/test-run.log 2>/dev/null || true
                '''
            }
        }
        stage('Copy Allure Results from Container') {
            when {
                expression { return params.STAGE_COUNT.toInteger() >= 11 }
            }
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
            // Отключено удаление контейнера для диагностики
            archiveArtifacts artifacts: 'allure-results/**/*', allowEmptyArchive: true
            // Collect container logs and internal /home/androidusr logs for debugging
            script {
                sh '''
                    set -e || true
                    mkdir -p ${WORKSPACE}/android-debug-logs || true
                    if docker ps -a | grep -q android-emulator; then
                        echo "Copying logs from container android-emulator into ${WORKSPACE}/android-debug-logs"
                        docker cp android-emulator:/home/androidusr/logs ${WORKSPACE}/android-debug-logs/ || true
                        docker cp android-emulator:/var/log ${WORKSPACE}/android-debug-logs/ || true
                        docker logs --timestamps --details android-emulator > ${WORKSPACE}/android-debug-logs/android-emulator-logs.txt 2>&1 || true
                    else
                        echo "Container android-emulator not present - nothing to copy"
                    fi
                '''
                archiveArtifacts artifacts: 'android-debug-logs/**/*', allowEmptyArchive: true
            }
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