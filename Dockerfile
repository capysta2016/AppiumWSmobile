FROM node:20-bullseye

# Установка OpenJDK
RUN apt-get update && apt-get install -y openjdk-11-jdk
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    curl \
    gnupg \
    software-properties-common \
    libgl1-mesa-glx \
    libx11-6 \
    libxcb1 \
    libxrandr2 \
    libxss1 \
    libgtk-3-0 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

# Установка Android SDK
ENV ANDROID_HOME /opt/android-sdk
RUN mkdir -p ${ANDROID_HOME} && cd ${ANDROID_HOME} \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip \
    && unzip commandlinetools-linux-8512546_latest.zip \
    && rm commandlinetools-linux-8512546_latest.zip \
    && mv cmdline-tools latest \
    && mkdir cmdline-tools \
    && mv latest cmdline-tools/

ENV PATH ${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator

# Принятие лицензий Android SDK
RUN yes | sdkmanager --licenses

# Установка Android платформ, эмулятора и системного образа
RUN sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0" "emulator" "system-images;android-33;google_apis;x86_64"

# Создание AVD
RUN echo "no" | avdmanager create avd -n test -k "system-images;android-33;google_apis;x86_64"

# Установка Appium
RUN npm install -g appium@3 @wdio/cli allure-commandline

# Установка драйвера UiAutomator2 для Appium
RUN appium driver install uiautomator2

# Копирование проекта
WORKDIR /app

# Скачивание APK-файла из GitHub Releases
RUN curl -L -o /app/build.apk https://github.com/capysta2016/AppiumWSmobile/releases/download/V1.0.0/build-1758888993235.apk

COPY package*.json ./
RUN npm install

COPY . .

# Порт для Appium
EXPOSE 4723

# Команда по умолчанию: запуск эмулятора и тестов
CMD ["sh", "-c", "emulator -avd test -no-audio -no-window -gpu swiftshader_indirect & sleep 30 && npm run test:local"]