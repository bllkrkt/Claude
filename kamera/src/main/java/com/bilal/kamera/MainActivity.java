package com.bilal.kamera;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.TotalCaptureResult;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Paint;
import android.graphics.drawable.GradientDrawable;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.view.TextureView;
import android.media.AudioManager;
import android.media.MediaActionSound;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Range;
import android.util.Rational;
import android.util.Size;
import android.util.TypedValue;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.OrientationEventListener;
import android.view.ScaleGestureDetector;
import android.view.Surface;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.camera2.interop.Camera2CameraControl;
import androidx.camera.camera2.interop.Camera2CameraInfo;
import androidx.camera.camera2.interop.Camera2Interop;
import androidx.camera.camera2.interop.CaptureRequestOptions;
import androidx.camera.camera2.interop.ExperimentalCamera2Interop;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraInfo;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.DynamicRange;
import androidx.camera.core.ExposureState;
import androidx.camera.core.FocusMeteringAction;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.MeteringPoint;
import androidx.camera.core.Preview;
import androidx.camera.core.UseCaseGroup;
import androidx.camera.core.ViewPort;
import androidx.camera.core.ZoomState;
import androidx.camera.core.resolutionselector.AspectRatioStrategy;
import androidx.camera.core.resolutionselector.ResolutionSelector;
import androidx.camera.core.resolutionselector.ResolutionStrategy;
import androidx.camera.extensions.ExtensionMode;
import androidx.camera.extensions.ExtensionsManager;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.video.FallbackStrategy;
import androidx.camera.video.MediaStoreOutputOptions;
import androidx.camera.video.PendingRecording;
import androidx.camera.video.QualitySelector;
import androidx.camera.video.Recorder;
import androidx.camera.video.Recording;
import androidx.camera.video.VideoCapabilities;
import androidx.camera.video.VideoCapture;
import androidx.camera.video.VideoRecordEvent;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.google.common.util.concurrent.ListenableFuture;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.PlanarYUVLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.HybridBinarizer;

import java.nio.ByteBuffer;
import java.util.EnumMap;
import java.util.Map;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@SuppressLint({"UnsafeOptInUsageError", "SetTextI18n", "ClickableViewAccessibility"})
@androidx.annotation.OptIn(markerClass = ExperimentalCamera2Interop.class)
public class MainActivity extends AppCompatActivity implements SensorEventListener {

    // Modlar
    static final int M_PRO = 0, M_NIGHT = 1, M_PORTRAIT = 2, M_PHOTO = 3, M_VIDEO = 4;
    static final String[] MODE_NAMES = {"PRO", "GECE", "PORTRE", "FOTOĞRAF", "VİDEO"};
    // Flaş: 0 kapalı, 1 oto, 2 açık, 3 fener
    static final int FL_OFF = 0, FL_AUTO = 1, FL_ON = 2, FL_TORCH = 3;
    // En-boy: 0 = 4:3, 1 = 16:9, 2 = 1:1, 3 = tam ekran
    static final String[] ASPECT_NAMES = {"4:3", "16:9", "1:1", "TAM"};
    static final int[] TIMERS = {0, 3, 5, 10};

    // Kaydırıcı türleri
    static final int S_NONE = 0, S_EV = 1, S_ISO = 2, S_SHUTTER = 3, S_FOCUS = 4, S_WB = 5, S_ZOOM = 6;

    static final int[] ISO_STOPS = {50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500,
            3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 25600, 51200};
    static final double[] SHUTTER_STOPS = {1 / 16000.0, 1 / 8000.0, 1 / 4000.0, 1 / 2000.0, 1 / 1000.0, 1 / 500.0, 1 / 250.0, 1 / 125.0,
            1 / 60.0, 1 / 30.0, 1 / 15.0, 1 / 8.0, 1 / 4.0, 1 / 2.0, 1, 2, 4, 8, 15, 30};
    static final int[] WB_MODES = {CaptureRequest.CONTROL_AWB_MODE_AUTO, CaptureRequest.CONTROL_AWB_MODE_INCANDESCENT,
            CaptureRequest.CONTROL_AWB_MODE_FLUORESCENT, CaptureRequest.CONTROL_AWB_MODE_DAYLIGHT,
            CaptureRequest.CONTROL_AWB_MODE_CLOUDY_DAYLIGHT, CaptureRequest.CONTROL_AWB_MODE_SHADE};
    static final String[] WB_NAMES = {"Oto", "Ampul", "Floresan", "Gün ışığı", "Bulutlu", "Gölge"};

    // Görünümler
    private FrameLayout root, previewBox;
    private PreviewView previewView;
    private OverlayView overlay;
    private HistogramView histogram;
    private View flashOverlay, topBar, permPanel, sliderPanel, proRow;
    private LinearLayout bottomBar, zoomRow, modeRow, proChips;
    private HorizontalScrollView modeScroll;
    private ImageButton btnFlash, btnHdr, btnGrid, btnSettings, btnFlip, btnPause;
    private TextView btnTimer, btnAspect, recTime, countdown, hint, sliderLabel, sliderAuto;
    private View btnTimerBox;
    private ImageView thumb;
    private ShutterView shutter;
    private SeekBar slider;

    // Kamera
    private ProcessCameraProvider provider;
    private ExtensionsManager extensions;
    private Camera camera;
    private ImageCapture imageCapture;
    private VideoCapture<Recorder> videoCapture;
    private Recording recording;
    private boolean recordingPaused;
    private long recStartMs;

    // Durum
    private SharedPreferences sp;
    private int mode = M_PHOTO, flash = FL_OFF, timerIdx = 0, aspect = 0, gridMode = 0;
    private boolean front, hdrOn;
    private final List<Integer> modes = new ArrayList<>();
    private int deviceRotation = Surface.ROTATION_0;
    private float uiRotation = 0;
    private int topInset, bottomInset;
    private CountDownTimer countDownTimer;
    private boolean capturing;
    private Uri lastUri;
    private boolean lastIsVideo;
    private boolean aeLocked, settingsOpened, galleryOpened, noAnalysis;

    // v2: filtre, dijital zoom, seri çekim, QR, konum
    private ImageButton btnFilter;
    private HorizontalScrollView filterRow;
    private LinearLayout filterChips;
    private TextView qrChip, burstCount;
    private int filterIdx;
    private boolean extActive;           // üretici modu (gece/portre/akıllı) açık mı
    private float digitalZoom = 1f;      // üretici modlarında vizör + kayıt sonrası kırpma ile zoom
    private boolean burst;
    private int burstShots;
    private Location lastLocation;
    private LocationManager locationManager;
    private String qrText;
    private long lastQrMs;
    private MultiFormatReader qrReader;
    private byte[] qrBuf;
    private String lensText = "";
    private final Runnable hideQr = () -> { qrChip.setVisibility(View.GONE); qrText = null; };
    private final LocationListener locListener = l -> lastLocation = l;
    private final ExecutorService postExec = Executors.newSingleThreadExecutor();

    // Pro
    private int proIso = -1, proWb = 0;
    private long proExp = -1;
    private float proFocus = -1;
    private volatile int liveIso = 0;
    private volatile long liveExp = 0;
    private volatile float liveFocus = 0;
    private Range<Integer> isoRange;
    private Range<Long> expRange;
    private float minFocusDist;
    private int sliderType = S_NONE;
    private final int[] isoList = new int[ISO_STOPS.length];
    private int isoCount;
    private final long[] expList = new long[SHUTTER_STOPS.length];
    private int expCount;
    private long lastHistMs, lastLiveUiMs;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService bg = Executors.newSingleThreadExecutor();
    private final ExecutorService analysisExec = Executors.newSingleThreadExecutor();
    private MediaActionSound sound;
    private ToneGenerator tone;
    private SensorManager sensors;
    private OrientationEventListener orientationListener;
    private ScaleGestureDetector scaleDetector;
    private GestureDetector gestureDetector;
    private final Runnable hideHint = () -> hint.setVisibility(View.GONE);
    private final Runnable hideSlider = () -> { if (mode != M_PRO || sliderType == S_ZOOM) closeSlider(); };
    private final Runnable recTick = new Runnable() {
        @Override public void run() { updateRecTime(); ui.postDelayed(this, 500); }
    };
    private long recPausedTotal, recPausedAt;

    // ------------------------------------------------------------------ yaşam döngüsü

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_main);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowInsetsControllerCompat wic = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        wic.hide(WindowInsetsCompat.Type.statusBars());
        wic.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        wic.setAppearanceLightNavigationBars(false);

        sp = P.sp(this);
        bindViews();
        restoreState();
        setupInsets();
        setupGestures();
        setupButtons();

        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        orientationListener = new OrientationEventListener(this) {
            @Override public void onOrientationChanged(int o) { onDeviceOrientation(o); }
        };
        try { sound = new MediaActionSound(); sound.load(MediaActionSound.SHUTTER_CLICK); } catch (Exception ignored) {}
        try { tone = new ToneGenerator(AudioManager.STREAM_SYSTEM, 60); } catch (Exception ignored) {}

        if (getIntent() != null && MediaStore.INTENT_ACTION_VIDEO_CAMERA.equals(getIntent().getAction())) mode = M_VIDEO;

        if (hasCameraPermission()) startCamera();
        else requestPerms();
        loadLastThumb();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (MediaStore.INTENT_ACTION_VIDEO_CAMERA.equals(intent.getAction()) && mode != M_VIDEO && recording == null) setMode(M_VIDEO);
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyGeneralSettings();
        if (orientationListener.canDetectOrientation()) orientationListener.enable();
        Sensor g = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);
        if (g == null) g = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (g != null) sensors.registerListener(this, g, SensorManager.SENSOR_DELAY_UI);
        startLocation();
        // Ayarlardan dönünce yeniden kur (çözünürlük vb. değişmiş olabilir)
        if (settingsOpened && provider != null && recording == null) bindCamera();
        settingsOpened = false;
        if (galleryOpened) {
            // Galeride silinmiş olabilir: son çekimi yeniden bul
            galleryOpened = false;
            lastUri = null;
            thumb.setImageDrawable(null);
            loadLastThumb();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        orientationListener.disable();
        sensors.unregisterListener(this);
        stopLocation();
        burst = false;
        cancelTimer();
        if (recording != null) stopRecording();
        saveState();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        bg.shutdown();
        analysisExec.shutdown();
        postExec.shutdown();
        if (sound != null) sound.release();
        if (tone != null) tone.release();
    }

    // ------------------------------------------------------------------ kurulum

    private void bindViews() {
        root = findViewById(R.id.root);
        previewBox = findViewById(R.id.previewBox);
        previewView = findViewById(R.id.preview);
        overlay = findViewById(R.id.overlay);
        histogram = findViewById(R.id.histogram);
        flashOverlay = findViewById(R.id.flashOverlay);
        topBar = findViewById(R.id.topBar);
        permPanel = findViewById(R.id.permPanel);
        sliderPanel = findViewById(R.id.sliderPanel);
        proRow = findViewById(R.id.proRow);
        bottomBar = findViewById(R.id.bottomBar);
        zoomRow = findViewById(R.id.zoomRow);
        modeRow = findViewById(R.id.modeRow);
        proChips = findViewById(R.id.proChips);
        modeScroll = findViewById(R.id.modeScroll);
        btnFlash = findViewById(R.id.btnFlash);
        btnHdr = findViewById(R.id.btnHdr);
        btnGrid = findViewById(R.id.btnGrid);
        btnSettings = findViewById(R.id.btnSettings);
        btnFlip = findViewById(R.id.btnFlip);
        btnFilter = findViewById(R.id.btnFilter);
        filterRow = findViewById(R.id.filterRow);
        filterChips = findViewById(R.id.filterChips);
        qrChip = findViewById(R.id.qrChip);
        burstCount = findViewById(R.id.burstCount);
        btnPause = findViewById(R.id.btnPause);
        btnTimer = findViewById(R.id.btnTimer);
        btnTimerBox = findViewById(R.id.btnTimerBox);
        btnAspect = findViewById(R.id.btnAspect);
        recTime = findViewById(R.id.recTime);
        countdown = findViewById(R.id.countdown);
        hint = findViewById(R.id.hint);
        sliderLabel = findViewById(R.id.sliderLabel);
        sliderAuto = findViewById(R.id.sliderAuto);
        thumb = findViewById(R.id.thumb);
        shutter = findViewById(R.id.shutter);
        slider = findViewById(R.id.slider);
        previewView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
    }

    private void restoreState() {
        mode = sp.getInt(P.ST_MODE, M_PHOTO);
        flash = sp.getInt(P.ST_FLASH, FL_OFF);
        timerIdx = sp.getInt(P.ST_TIMER, 0);
        aspect = sp.getInt(P.ST_ASPECT, 0);
        hdrOn = sp.getBoolean(P.ST_HDR, false);
        front = sp.getBoolean(P.ST_FRONT, false);
        filterIdx = sp.getInt(P.ST_FILTER, 0);
        if (filterIdx < 0 || filterIdx >= Filters.count()) filterIdx = 0;
        if (mode < 0 || mode > M_VIDEO) mode = M_PHOTO;
        if (aspect < 0 || aspect > 3) aspect = 0;
        if (timerIdx < 0 || timerIdx >= TIMERS.length) timerIdx = 0;
    }

    private void saveState() {
        sp.edit().putInt(P.ST_MODE, mode).putInt(P.ST_FLASH, flash).putInt(P.ST_TIMER, timerIdx)
                .putInt(P.ST_ASPECT, aspect).putBoolean(P.ST_HDR, hdrOn).putBoolean(P.ST_FRONT, front).putInt(P.ST_FILTER, filterIdx).apply();
    }

    private void applyGeneralSettings() {
        String g = sp.getString(P.GRID, "3");
        gridMode = "golden".equals(g) ? -1 : P.i(sp, P.GRID, 0);
        overlay.setGrid(gridMode);
        btnGrid.setAlpha(gridMode != 0 ? 1f : 0.45f);
        overlay.setLevelEnabled(sp.getBoolean(P.LEVEL, true));
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.screenBrightness = sp.getBoolean(P.MAX_BRIGHTNESS, false) ? 1f : WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
        getWindow().setAttributes(lp);
    }

    private void setupInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets i = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            topInset = i.top;
            bottomInset = i.bottom;
            topBar.setPadding(topBar.getPaddingLeft(), topInset, topBar.getPaddingRight(), 0);
            bottomBar.setPadding(0, 0, 0, bottomInset + dp(8));
            FrameLayout.LayoutParams rp = (FrameLayout.LayoutParams) recTime.getLayoutParams();
            rp.topMargin = topInset + dp(60);
            recTime.setLayoutParams(rp);
            layoutPreview();
            return insets;
        });
        root.addOnLayoutChangeListener((v, l, t, r, bt, ol, ot, or, ob) -> {
            if (r - l != or - ol || bt - t != ob - ot) layoutPreview();
        });
    }

    /** Vizörü seçilen en-boy oranına göre boyutlandırır. */
    private void layoutPreview() {
        int w = root.getWidth(), h = root.getHeight();
        if (w == 0 || h == 0) return;
        int ph, top;
        int a = mode == M_VIDEO ? 1 : aspect;
        if (a == 3) { ph = h; top = 0; }
        else {
            float r = a == 0 ? 4f / 3f : a == 1 ? 16f / 9f : 1f;
            ph = Math.round(w * r);
            top = topInset + dp(52);
            if (a == 1 && top + ph > h) top = Math.max(0, h - ph);
            if (a == 2) top = topInset + dp(52) + Math.round(w * (4f / 3f - 1f) / 2f);
        }
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) previewBox.getLayoutParams();
        if (lp.height != ph || lp.topMargin != top) {
            lp.width = ViewGroup.LayoutParams.MATCH_PARENT;
            lp.height = ph;
            lp.topMargin = top;
            lp.gravity = Gravity.TOP;
            previewBox.setLayoutParams(lp);
        }
    }

    private Rational viewPortRatio() {
        int a = mode == M_VIDEO ? 1 : aspect;
        switch (a) {
            case 1: return new Rational(9, 16);
            case 2: return new Rational(1, 1);
            case 3: {
                int w = root.getWidth(), h = root.getHeight();
                if (w > 0 && h > 0) return new Rational(w, h);
                return new Rational(9, 20);
            }
            default: return new Rational(3, 4);
        }
    }

    private void setupButtons() {
        shutter.setOnClickListener(v -> onShutter());
        shutter.setOnHold(this::burstStart, this::burstEnd);
        btnFlip.setOnClickListener(v -> flipCamera());
        thumb.setOnClickListener(v -> { galleryOpened = true; startActivity(new Intent(this, GalleryActivity.class)); });
        thumb.setOnLongClickListener(v -> { openLast(); return true; });
        btnFilter.setOnClickListener(v -> {
            boolean show = filterRow.getVisibility() != View.VISIBLE;
            filterRow.setVisibility(show ? View.VISIBLE : View.GONE);
            if (show) buildFilterChips();
        });
        qrChip.setOnClickListener(v -> onQrClick());
        btnPause.setOnClickListener(v -> togglePause());
        btnFlash.setOnClickListener(v -> cycleFlash());
        btnHdr.setOnClickListener(v -> {
            hdrOn = !hdrOn;
            boolean isHdr = smartExt() == ExtensionMode.HDR;
            showHint(isHdr ? (hdrOn ? "HDR açık" : "HDR kapalı") : (hdrOn ? "Akıllı sahne açık\n(gece/HDR otomatik)" : "Akıllı sahne kapalı"));
            updateTopBar();
            bindCamera();
        });
        btnTimerBox.setOnClickListener(v -> {
            timerIdx = (timerIdx + 1) % TIMERS.length;
            showHint(TIMERS[timerIdx] == 0 ? "Zamanlayıcı kapalı" : "Zamanlayıcı: " + TIMERS[timerIdx] + " sn");
            updateTopBar();
        });
        btnAspect.setOnClickListener(v -> {
            aspect = (aspect + 1) % 4;
            updateTopBar();
            layoutPreview();
            bindCamera();
        });
        btnGrid.setOnClickListener(v -> {
            String next = gridMode == 0 ? "3" : gridMode == 3 ? "4" : gridMode == 4 ? "golden" : "0";
            sp.edit().putString(P.GRID, next).apply();
            applyGeneralSettings();
            showHint(gridMode == 0 ? "Izgara kapalı" : gridMode == -1 ? "Izgara: altın oran" : "Izgara: " + gridMode + "×" + gridMode);
        });
        btnSettings.setOnClickListener(v -> { settingsOpened = true; startActivity(new Intent(this, SettingsActivity.class)); });
        findViewById(R.id.btnPerm).setOnClickListener(v -> {
            if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA)) requestPerms();
            else startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getPackageName(), null)));
        });
        sliderAuto.setOnClickListener(v -> sliderAutoPressed());
        slider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar s, int p, boolean user) { if (user) onSliderChanged(p); }
            @Override public void onStartTrackingTouch(SeekBar s) { ui.removeCallbacks(hideSlider); }
            @Override public void onStopTrackingTouch(SeekBar s) { scheduleSliderHide(); }
        });
        updateTopBar();
    }

    private void setupGestures() {
        scaleDetector = new ScaleGestureDetector(this, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            @Override public boolean onScale(@NonNull ScaleGestureDetector d) {
                if (camera == null) return false;
                if (extActive) { setDigitalZoom(digitalZoom * d.getScaleFactor()); return true; }
                ZoomState z = camera.getCameraInfo().getZoomState().getValue();
                if (z == null) return false;
                float nz = Math.max(z.getMinZoomRatio(), Math.min(z.getMaxZoomRatio(), z.getZoomRatio() * d.getScaleFactor()));
                camera.getCameraControl().setZoomRatio(nz);
                return true;
            }
        });
        gestureDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override public boolean onDown(@NonNull MotionEvent e) { return true; }
            @Override public boolean onSingleTapUp(@NonNull MotionEvent e) { focusAt(e.getX(), e.getY(), false); return true; }
            @Override public void onLongPress(@NonNull MotionEvent e) {
                if (scaleDetector.isInProgress()) return;
                focusAt(e.getX(), e.getY(), true);
            }
            @Override public boolean onFling(MotionEvent e1, @NonNull MotionEvent e2, float vx, float vy) {
                if (e1 == null || recording != null || capturing) return false;
                float dx = e2.getX() - e1.getX(), dy = e2.getY() - e1.getY();
                if (Math.abs(dx) > dp(70) && Math.abs(dx) > Math.abs(dy) * 1.5f) {
                    int idx = modes.indexOf(mode);
                    int ni = idx + (dx < 0 ? 1 : -1);
                    if (idx >= 0 && ni >= 0 && ni < modes.size()) setMode(modes.get(ni));
                    return true;
                }
                if (Math.abs(dy) > dp(90) && Math.abs(dy) > Math.abs(dx) * 1.5f) { flipCamera(); return true; }
                return false;
            }
        });
        previewView.setOnTouchListener((v, e) -> {
            scaleDetector.onTouchEvent(e);
            if (!scaleDetector.isInProgress()) gestureDetector.onTouchEvent(e);
            return true;
        });
    }

    // ------------------------------------------------------------------ izinler

    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasAudioPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestPerms() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 1);
    }

    @Override
    public void onRequestPermissionsResult(int rc, @NonNull String[] perms, @NonNull int[] res) {
        super.onRequestPermissionsResult(rc, perms, res);
        if (rc == 2) { startLocation(); return; }
        if (hasCameraPermission()) { permPanel.setVisibility(View.GONE); startCamera(); }
        else permPanel.setVisibility(View.VISIBLE);
    }

    // ------------------------------------------------------------------ kamera

    private void startCamera() {
        permPanel.setVisibility(View.GONE);
        ListenableFuture<ProcessCameraProvider> f = ProcessCameraProvider.getInstance(this);
        f.addListener(() -> {
            try {
                provider = f.get();
            } catch (Exception e) {
                showHint("Kamera açılamadı");
                return;
            }
            if (!hasCam(true)) front = false;
            ListenableFuture<ExtensionsManager> ef = ExtensionsManager.getInstanceAsync(this, provider);
            ef.addListener(() -> {
                try { extensions = ef.get(); } catch (Exception e) { extensions = null; }
                bg.execute(() -> {
                    try { Caps.probe(this, provider, extensions); } catch (Exception ignored) {}
                });
                rebuildModes();
                bindCamera();
            }, ContextCompat.getMainExecutor(this));
        }, ContextCompat.getMainExecutor(this));
    }

    private boolean hasCam(boolean wantFront) {
        try { return provider.hasCamera(wantFront ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA); }
        catch (Exception e) { return false; }
    }

    private CameraSelector baseSelector() {
        return front ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA;
    }

    private boolean extAvailable(int extMode) {
        try { return extensions != null && extensions.isExtensionAvailable(baseSelector(), extMode); } catch (Exception e) { return false; }
    }

    /** Bu kamerada kullanılabilen modları hesaplar ve mod çubuğunu çizer. */
    private void rebuildModes() {
        modes.clear();
        modes.add(M_PRO);
        if (extAvailable(ExtensionMode.NIGHT)) modes.add(M_NIGHT);
        if (extAvailable(ExtensionMode.BOKEH)) modes.add(M_PORTRAIT);
        modes.add(M_PHOTO);
        modes.add(M_VIDEO);
        if (!modes.contains(mode)) mode = M_PHOTO;
        modeRow.removeAllViews();
        int side = getResources().getDisplayMetrics().widthPixels / 2 - dp(40);
        modeRow.setPadding(side, 0, side, 0);
        for (int m : modes) {
            TextView t = new TextView(this);
            t.setText(MODE_NAMES[m]);
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
            t.setLetterSpacing(0.06f);
            t.setPadding(dp(13), dp(8), dp(13), dp(8));
            t.setTag(m);
            t.setOnClickListener(v -> { if (recording == null && !capturing) setMode((Integer) v.getTag()); });
            modeRow.addView(t);
        }
        highlightMode();
    }

    private void highlightMode() {
        for (int i = 0; i < modeRow.getChildCount(); i++) {
            TextView t = (TextView) modeRow.getChildAt(i);
            boolean on = ((Integer) t.getTag()) == mode;
            t.setTextColor(on ? ContextCompat.getColor(this, R.color.accent) : 0xCCFFFFFF);
            t.setTypeface(null, on ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
            if (on) {
                final View tv = t;
                modeScroll.post(() -> modeScroll.smoothScrollTo(tv.getLeft() + tv.getWidth() / 2 - modeScroll.getWidth() / 2, 0));
            }
        }
    }

    private void setMode(int m) {
        if (m == mode) return;
        mode = m;
        closeSlider();
        highlightMode();
        updateTopBar();
        layoutPreview();
        showHint(MODE_NAMES[m].charAt(0) + MODE_NAMES[m].substring(1).toLowerCase(new Locale("tr")));
        bindCamera();
    }

    private void flipCamera() {
        if (recording != null || capturing || provider == null) return;
        if (!hasCam(!front)) { showHint("Diğer kamera bulunamadı"); return; }
        front = !front;
        btnFlip.animate().rotationBy(180).setDuration(300).start();
        rebuildModes();
        updateTopBar();
        bindCamera();
    }

    private void bindCamera() { bindCamera(false); }

    /** Seçilen moda göre kamera kullanım durumlarını bağlar. safe=true ise riskli seçenekler kapatılır. */
    private void bindCamera(boolean safe) {
        if (provider == null || isFinishing()) return;
        if (recording != null) return;
        try { provider.unbindAll(); } catch (Exception ignored) {}
        camera = null;
        imageCapture = null;
        videoCapture = null;
        aeLocked = false;
        overlay.clearFocus();
        histogram.setVisibility(View.GONE);

        CameraSelector base = baseSelector();
        CameraSelector sel = base;
        int extMode = -1;
        if (!safe) {
            if (mode == M_NIGHT) extMode = ExtensionMode.NIGHT;
            else if (mode == M_PORTRAIT) extMode = ExtensionMode.BOKEH;
            else if (mode == M_PHOTO && hdrOn && smartExt() >= 0) extMode = smartExt();
            if (extMode >= 0 && extAvailable(extMode)) sel = extensions.getExtensionEnabledCameraSelector(base, extMode);
            else extMode = -1;
        }

        CameraInfo info;
        try { info = provider.getCameraInfo(base); } catch (Exception e) { showHint("Kamera bulunamadı"); return; }
        readProRanges(info);

        Preview.Builder pb = new Preview.Builder();
        boolean video = mode == M_VIDEO;
        int ratio = (video || aspect == 1 || aspect == 3) ? AspectRatio_16_9 : AspectRatio_4_3;
        pb.setResolutionSelector(new ResolutionSelector.Builder()
                .setAspectRatioStrategy(ratioStrategy(ratio)).build());
        if (mode == M_PRO && extMode < 0) {
            new Camera2Interop.Extender<>(pb).setSessionCaptureCallback(new CameraCaptureSession.CaptureCallback() {
                @Override public void onCaptureCompleted(@NonNull CameraCaptureSession s, @NonNull CaptureRequest r, @NonNull TotalCaptureResult res) {
                    Integer iso = res.get(android.hardware.camera2.CaptureResult.SENSOR_SENSITIVITY);
                    Long exp = res.get(android.hardware.camera2.CaptureResult.SENSOR_EXPOSURE_TIME);
                    Float fd = res.get(android.hardware.camera2.CaptureResult.LENS_FOCUS_DISTANCE);
                    if (iso != null) liveIso = iso;
                    if (exp != null) liveExp = exp;
                    if (fd != null) liveFocus = fd;
                    long now = SystemClock.uptimeMillis();
                    if (now - lastLiveUiMs > 400) { lastLiveUiMs = now; ui.post(MainActivity.this::refreshProChips); }
                }
            });
        }

        UseCaseGroup.Builder group = new UseCaseGroup.Builder();
        group.setViewPort(new ViewPort.Builder(viewPortRatio(), Surface.ROTATION_0).build());

        if (video) {
            VideoCapabilities vc = Recorder.getVideoCapabilities(info);
            boolean hlg = !safe && sp.getBoolean(P.VIDEO_HDR, false) && vc.getSupportedDynamicRanges().contains(DynamicRange.HLG_10_BIT);
            DynamicRange dr = hlg ? DynamicRange.HLG_10_BIT : DynamicRange.SDR;
            QualitySelector qs = QualitySelector.from(Caps.quality(sp.getString(P.VIDEO_QUALITY, "UHD")),
                    FallbackStrategy.lowerQualityOrHigherThan(Caps.quality(sp.getString(P.VIDEO_QUALITY, "UHD"))));
            Recorder.Builder rb = new Recorder.Builder().setQualitySelector(qs).setAspectRatio(AspectRatio_16_9);
            int mbps = P.i(sp, P.VIDEO_BITRATE, 0);
            if (mbps > 0 && !safe) rb.setTargetVideoEncodingBitRate(mbps * 1_000_000);
            Recorder recorder = rb.build();
            VideoCapture.Builder<Recorder> vb = new VideoCapture.Builder<>(recorder).setTargetRotation(deviceRotation).setDynamicRange(dr);
            boolean stab = !safe && sp.getBoolean(P.VIDEO_STAB, true);
            if (stab) {
                if (Preview.getPreviewCapabilities(info).isStabilizationSupported()) pb.setPreviewStabilizationEnabled(true);
                else if (vc.isStabilizationSupported()) vb.setVideoStabilizationEnabled(true);
            }
            int fps = P.i(sp, P.VIDEO_FPS, 30);
            if (!safe && fps == 60 && supportsFps(info, 60)) vb.setTargetFrameRate(new Range<>(60, 60));
            else if (!safe && supportsFps(info, 30)) vb.setTargetFrameRate(new Range<>(30, 30));
            videoCapture = vb.build();
        } else {
            imageCapture = buildImageCapture(info, safe, extMode >= 0);
        }

        Preview preview = pb.build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());
        group.addUseCase(preview);
        if (video) group.addUseCase(videoCapture);
        else group.addUseCase(imageCapture);

        ImageAnalysis analysis = null;
        boolean wantHist = mode == M_PRO && sp.getBoolean(P.HISTOGRAM, true);
        boolean wantQr = mode == M_PHOTO && extMode < 0 && sp.getBoolean(P.QR, true);
        if (!safe && !noAnalysis && (wantHist || wantQr)) {
            analysis = new ImageAnalysis.Builder()
                    .setResolutionSelector(new ResolutionSelector.Builder()
                            .setResolutionStrategy(new ResolutionStrategy(new Size(640, 480), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER))
                            .build())
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build();
            analysis.setAnalyzer(analysisExec, this::analyze);
            group.addUseCase(analysis);
        }

        try {
            camera = provider.bindToLifecycle(this, sel, group.build());
        } catch (Exception e) {
            if (!safe && analysis != null && !noAnalysis) {
                // Önce yalnızca QR/histogram analizini çıkararak dene (RAW vb. seçimler korunur)
                noAnalysis = true;
                bindCamera(false);
                noAnalysis = false;
                return;
            }
            if (!safe) {
                // Bazı seçenek birleşimleri desteklenmeyebilir: daha sade ayarlarla tekrar dene
                if (mode == M_NIGHT || mode == M_PORTRAIT) showHint("Bu mod şu an açılamadı");
                bindCamera(true);
            } else {
                showHint("Kamera başlatılamadı");
            }
            return;
        }
        if (analysis != null && wantHist) histogram.setVisibility(View.VISIBLE);
        extActive = extMode >= 0;
        digitalZoom = 1f;
        previewView.setScaleX(1f);
        previewView.setScaleY(1f);
        qrChip.setVisibility(View.GONE);
        filterRow.setVisibility(View.GONE);
        btnFilter.setVisibility(video ? View.GONE : View.VISIBLE);
        schedulePreviewFilter();
        applyTorch();
        camera.getCameraInfo().getZoomState().removeObservers(this);
        camera.getCameraInfo().getZoomState().observe(this, this::onZoomChanged);
        buildZoomChips();
        updateTopBar();
        updateShutterState();
        updateProUi();
        applyPro(); // pro dışı modlarda elle ayarları temizler
    }

    static final int AspectRatio_4_3 = androidx.camera.core.AspectRatio.RATIO_4_3;
    static final int AspectRatio_16_9 = androidx.camera.core.AspectRatio.RATIO_16_9;

    private AspectRatioStrategy ratioStrategy(int r) {
        return r == AspectRatio_16_9 ? AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY : AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY;
    }

    private boolean supportsFps(CameraInfo info, int fps) {
        try {
            for (Range<Integer> r : info.getSupportedFrameRateRanges()) if (r.getLower() <= fps && r.getUpper() >= fps) return true;
        } catch (Exception ignored) {}
        return false;
    }

    private ImageCapture buildImageCapture(CameraInfo info, boolean safe, boolean ext) {
        String facing = front ? "front" : "back";
        int ratio = (aspect == 1 || aspect == 3) ? AspectRatio_16_9 : AspectRatio_4_3;
        float aspectF = ratio == AspectRatio_16_9 ? 16f / 9f : 4f / 3f;
        int mp = P.i(sp, front ? P.PHOTO_MP_FRONT : P.PHOTO_MP_BACK, 0);
        List<Size> sizes = P.parseSizes(sp.getString(P.cap(facing, "sizes"), ""));
        List<Size> hi = P.parseSizes(sp.getString(P.cap(facing, "hisizes"), ""));
        Size target = safe ? null : P.pick(sizes, aspectF, mp);

        ResolutionSelector.Builder rs = new ResolutionSelector.Builder().setAspectRatioStrategy(ratioStrategy(ratio));
        if (target != null) {
            rs.setResolutionStrategy(new ResolutionStrategy(target, ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER));
            if (hi.contains(target)) rs.setAllowedResolutionMode(ResolutionSelector.PREFER_HIGHER_RESOLUTION_OVER_CAPTURE_RATE);
        } else {
            rs.setResolutionStrategy(ResolutionStrategy.HIGHEST_AVAILABLE_STRATEGY);
        }

        String cm = sp.getString(P.CAPTURE_MODE, "quality");
        int captureMode = ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY;
        if ("latency".equals(cm)) captureMode = ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY;
        else if ("zsl".equals(cm) && !ext && sp.getBoolean(P.cap(facing, "zsl"), false)) captureMode = ImageCapture.CAPTURE_MODE_ZERO_SHUTTER_LAG;

        ImageCapture.Builder b = new ImageCapture.Builder()
                .setCaptureMode(captureMode)
                .setJpegQuality(Math.max(50, Math.min(100, P.i(sp, P.JPEG_QUALITY, 95))))
                .setTargetRotation(deviceRotation)
                .setResolutionSelector(rs.build())
                .setFlashMode(imageFlashMode());
        if (front && flash == FL_ON) {
            try {
                previewView.setScreenFlashWindow(getWindow());
                b.setScreenFlash(previewView.getScreenFlash());
            } catch (Exception e) { b.setFlashMode(ImageCapture.FLASH_MODE_OFF); }
        }

        if (!safe && !ext && captureMode != ImageCapture.CAPTURE_MODE_ZERO_SHUTTER_LAG) {
            String fmt = sp.getString(P.PHOTO_FORMAT, "jpeg");
            Set<Integer> fs = supportedFormats(info);
            if ("uhdr".equals(fmt) && fs.contains(ImageCapture.OUTPUT_FORMAT_JPEG_ULTRA_HDR)) b.setOutputFormat(ImageCapture.OUTPUT_FORMAT_JPEG_ULTRA_HDR);
            else if ("raw".equals(fmt) && fs.contains(ImageCapture.OUTPUT_FORMAT_RAW_JPEG)) b.setOutputFormat(ImageCapture.OUTPUT_FORMAT_RAW_JPEG);
        }
        return b.build();
    }

    private Set<Integer> supportedFormats(CameraInfo info) {
        try { return ImageCapture.getImageCaptureCapabilities(info).getSupportedOutputFormats(); }
        catch (Exception e) { return java.util.Collections.emptySet(); }
    }

    private int imageFlashMode() {
        if (front) return flash == FL_ON ? ImageCapture.FLASH_MODE_SCREEN : ImageCapture.FLASH_MODE_OFF;
        switch (flash) {
            case FL_AUTO: return ImageCapture.FLASH_MODE_AUTO;
            case FL_ON: return ImageCapture.FLASH_MODE_ON;
            default: return ImageCapture.FLASH_MODE_OFF;
        }
    }

    private void applyTorch() {
        if (camera == null) return;
        boolean torch = !front && flash == FL_TORCH;
        if (camera.getCameraInfo().hasFlashUnit()) camera.getCameraControl().enableTorch(torch);
    }

    // ------------------------------------------------------------------ çekim

    private void onShutter() {
        if (camera == null) return;
        if (countDownTimer != null) { cancelTimer(); return; }
        if (mode == M_VIDEO) {
            if (recording != null) stopRecording();
            else withTimer(this::startRecording);
        } else {
            if (capturing || burst) return;
            withTimer(() -> takePhoto(false));
        }
    }

    private void withTimer(Runnable action) {
        int sec = TIMERS[timerIdx];
        if (sec == 0) { action.run(); return; }
        countdown.setVisibility(View.VISIBLE);
        countdown.setRotation(uiRotation);
        countDownTimer = new CountDownTimer(sec * 1000L, 1000) {
            @Override public void onTick(long left) {
                int s = (int) Math.ceil(left / 1000.0);
                countdown.setText(String.valueOf(s));
                countdown.setScaleX(1.3f); countdown.setScaleY(1.3f);
                countdown.animate().scaleX(1f).scaleY(1f).setDuration(300).start();
                if (tone != null) tone.startTone(ToneGenerator.TONE_PROP_BEEP, 80);
            }
            @Override public void onFinish() {
                countDownTimer = null;
                countdown.setVisibility(View.GONE);
                action.run();
            }
        }.start();
    }

    private void cancelTimer() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
            countDownTimer = null;
            countdown.setVisibility(View.GONE);
            showHint("Zamanlayıcı iptal");
        }
    }

    private String folder() {
        String f = sp.getString(P.SAVE_FOLDER, "Camera");
        return "DCIM/" + ("KameraPlus".equals(f) ? "KameraPlus" : "Camera");
    }

    private String stamp() {
        return new SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US).format(new Date());
    }

    private void takePhoto(boolean burstShot) {
        ImageCapture ic = imageCapture;
        if (ic == null) return;
        capturing = true;
        if (!burstShot) shutter.setBusy(true);
        PostProcessor.Job job = makeJob();
        String name = "IMG_" + stamp();
        ContentValues cv = new ContentValues();
        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        cv.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");
        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, folder());
        ImageCapture.Metadata meta = new ImageCapture.Metadata();
        if (front && sp.getBoolean(P.MIRROR_FRONT, true)) meta.setReversedHorizontal(true);
        if (sp.getBoolean(P.LOCATION, false) && lastLocation != null) meta.setLocation(lastLocation);
        ImageCapture.OutputFileOptions jpeg = new ImageCapture.OutputFileOptions.Builder(getContentResolver(),
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv).setMetadata(meta).build();

        boolean night = mode == M_NIGHT;
        if (night) showHint("Sabit tutun…", 60_000);
        ImageCapture.OnImageSavedCallback cb = new ImageCapture.OnImageSavedCallback() {
            @Override public void onCaptureStarted() {
                shutterFeedback();
                if (burstShot) {
                    burstShots++;
                    burstCount.setText(String.valueOf(burstShots));
                    ui.post(MainActivity.this::burstNext);
                }
            }
            @Override public void onCaptureProcessProgressed(int p) { if (night) showHint("İşleniyor %" + p, 60_000); }
            @Override public void onImageSaved(@NonNull ImageCapture.OutputFileResults r) {
                capturing = false;
                if (!burstShot) shutter.setBusy(false);
                if (night) hideHintNow();
                Uri u = r.getSavedUri();
                if (u == null) return;
                String mt = null;
                try { mt = getContentResolver().getType(u); } catch (Exception ignored) {}
                if (mt != null && mt.contains("dng")) return; // RAW dosyasına dokunma, JPEG eşi işlenir
                lastUri = u;
                lastIsVideo = false;
                job.uri = u;
                if (PostProcessor.needed(job)) postProcess(job);
                else loadThumb(u, false);
            }
            @Override public void onError(@NonNull ImageCaptureException e) {
                capturing = false;
                shutter.setBusy(false);
                if (burstShot) burstEnd();
                showHint("Fotoğraf kaydedilemedi (" + e.getImageCaptureError() + ")");
            }
        };
        try {
            if (ic.getOutputFormat() == ImageCapture.OUTPUT_FORMAT_RAW_JPEG) {
                ContentValues rv = new ContentValues();
                rv.put(MediaStore.MediaColumns.DISPLAY_NAME, name + ".dng");
                rv.put(MediaStore.MediaColumns.MIME_TYPE, "image/x-adobe-dng");
                rv.put(MediaStore.MediaColumns.RELATIVE_PATH, folder());
                ImageCapture.OutputFileOptions raw = new ImageCapture.OutputFileOptions.Builder(getContentResolver(),
                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, rv).build();
                ic.takePicture(raw, jpeg, ContextCompat.getMainExecutor(this), cb);
            } else {
                ic.takePicture(jpeg, ContextCompat.getMainExecutor(this), cb);
            }
        } catch (Exception e) {
            capturing = false;
            shutter.setBusy(false);
            showHint("Çekim başarısız");
        }
    }

    private void shutterFeedback() {
        if (sp.getBoolean(P.SHUTTER_SOUND, true) && sound != null) sound.play(MediaActionSound.SHUTTER_CLICK);
        shutter.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
        flashOverlay.animate().cancel();
        flashOverlay.setAlpha(0.85f);
        flashOverlay.animate().alpha(0f).setDuration(220).start();
    }

    @SuppressLint("MissingPermission")
    private void startRecording() {
        VideoCapture<Recorder> vcap = videoCapture;
        if (vcap == null) return;
        vcap.setTargetRotation(deviceRotation);
        ContentValues cv = new ContentValues();
        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, "VID_" + stamp());
        cv.put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4");
        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, folder());
        MediaStoreOutputOptions out = new MediaStoreOutputOptions.Builder(getContentResolver(),
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI).setContentValues(cv).build();
        PendingRecording pr = vcap.getOutput().prepareRecording(this, out);
        if (sp.getBoolean(P.VIDEO_AUDIO, true) && hasAudioPermission()) pr = pr.withAudioEnabled();
        try {
            recording = pr.start(ContextCompat.getMainExecutor(this), this::onRecordEvent);
        } catch (Exception e) {
            recording = null;
            showHint("Kayıt başlatılamadı");
            return;
        }
        recordingPaused = false;
        recStartMs = SystemClock.elapsedRealtime();
        recPausedTotal = 0;
        if (sound != null && sp.getBoolean(P.SHUTTER_SOUND, true)) sound.play(MediaActionSound.START_VIDEO_RECORDING);
        updateShutterState();
        updateRecordingUi(true);
        ui.post(recTick);
    }

    private void stopRecording() {
        if (recording == null) return;
        try { recording.stop(); } catch (Exception ignored) {}
        recording = null;
        recordingPaused = false;
        ui.removeCallbacks(recTick);
        if (sound != null && sp.getBoolean(P.SHUTTER_SOUND, true)) sound.play(MediaActionSound.STOP_VIDEO_RECORDING);
        updateShutterState();
        updateRecordingUi(false);
    }

    private void togglePause() {
        if (recording == null) return;
        if (recordingPaused) {
            recording.resume();
            recordingPaused = false;
            recPausedTotal += SystemClock.elapsedRealtime() - recPausedAt;
            btnPause.setImageResource(R.drawable.ic_pause);
        } else {
            recording.pause();
            recordingPaused = true;
            recPausedAt = SystemClock.elapsedRealtime();
            btnPause.setImageResource(R.drawable.ic_play);
        }
        updateRecTime();
    }

    private void onRecordEvent(VideoRecordEvent e) {
        if (e instanceof VideoRecordEvent.Finalize) {
            VideoRecordEvent.Finalize f = (VideoRecordEvent.Finalize) e;
            Uri uri = f.getOutputResults().getOutputUri();
            boolean ok = !f.hasError() || (uri != null && uri != Uri.EMPTY
                    && f.getError() != VideoRecordEvent.Finalize.ERROR_NO_VALID_DATA
                    && f.getError() != VideoRecordEvent.Finalize.ERROR_ENCODING_FAILED);
            if (ok && uri != null && uri != Uri.EMPTY) {
                lastUri = uri;
                lastIsVideo = true;
                loadThumb(uri, true);
                showHint("Video kaydedildi");
            } else {
                showHint("Video kaydedilemedi (" + f.getError() + ")");
            }
            if (recording != null) { recording = null; updateShutterState(); updateRecordingUi(false); ui.removeCallbacks(recTick); }
        }
    }

    private void updateRecTime() {
        if (recording == null) return;
        long now = SystemClock.elapsedRealtime();
        long paused = recPausedTotal + (recordingPaused ? now - recPausedAt : 0);
        long s = (now - recStartMs - paused) / 1000;
        String t = s >= 3600 ? String.format(Locale.US, "%d:%02d:%02d", s / 3600, (s / 60) % 60, s % 60)
                : String.format(Locale.US, "%02d:%02d", s / 60, s % 60);
        recTime.setText((recordingPaused ? "❚❚ " : "● ") + t);
    }

    private void updateRecordingUi(boolean rec) {
        recTime.setVisibility(rec ? View.VISIBLE : View.GONE);
        btnPause.setVisibility(rec ? View.VISIBLE : View.GONE);
        btnPause.setImageResource(R.drawable.ic_pause);
        thumb.setVisibility(rec ? View.INVISIBLE : View.VISIBLE);
        float a = rec ? 0f : 1f;
        modeScroll.animate().alpha(a).setDuration(200).start();
        btnFlip.animate().alpha(rec ? 0.3f : 1f).setDuration(200).start();
        btnSettings.setEnabled(!rec);
        btnSettings.setAlpha(rec ? 0.3f : 1f);
        btnAspect.setEnabled(!rec);
        if (rec) updateRecTime();
    }

    private void updateShutterState() {
        shutter.setState(mode == M_VIDEO ? (recording != null ? ShutterView.RECORDING : ShutterView.VIDEO) : ShutterView.PHOTO);
    }

    // ------------------------------------------------------------------ odak / pozlama

    private void focusAt(float x, float y, boolean lock) {
        if (camera == null) return;
        if (mode == M_PRO && proFocus >= 0 && (proIso > 0 || proExp > 0)) return; // tamamen elle
        MeteringPoint p = previewView.getMeteringPointFactory().createPoint(x, y);
        int flags = FocusMeteringAction.FLAG_AF | FocusMeteringAction.FLAG_AE | FocusMeteringAction.FLAG_AWB;
        if (mode == M_PRO && proFocus >= 0) flags = FocusMeteringAction.FLAG_AE | FocusMeteringAction.FLAG_AWB;
        if (mode == M_PRO && (proIso > 0 || proExp > 0)) flags = FocusMeteringAction.FLAG_AF;
        FocusMeteringAction.Builder ab = new FocusMeteringAction.Builder(p, flags);
        if (lock) ab.disableAutoCancel(); else ab.setAutoCancelDuration(5, java.util.concurrent.TimeUnit.SECONDS);
        try { camera.getCameraControl().startFocusAndMetering(ab.build()); } catch (Exception ignored) {}
        aeLocked = lock;
        overlay.showFocus(x, y, lock);
        if (lock) {
            previewView.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
            showHint("AE/AF KİLİTLİ");
        }
        if (mode != M_PRO && camera.getCameraInfo().getExposureState().isExposureCompensationSupported()) openSlider(S_EV);
    }

    // ------------------------------------------------------------------ yakınlaştırma

    private void buildZoomChips() {
        zoomRow.removeAllViews();
        if (camera == null) return;
        if (extActive) { buildDigitalZoomChips(); return; }
        ZoomState z = camera.getCameraInfo().getZoomState().getValue();
        float min = z != null ? z.getMinZoomRatio() : 1f, max = z != null ? z.getMaxZoomRatio() : 1f;
        List<Float> stops = new ArrayList<>();
        if (min < 0.95f) stops.add(min);
        stops.add(1f);
        if (max >= 2f) stops.add(2f);
        if (max >= 5f) stops.add(5f);
        if (max >= 10f) stops.add(10f);
        if (stops.size() < 2 && max <= 1.01f) { zoomRow.setVisibility(View.GONE); return; }
        zoomRow.setVisibility(View.VISIBLE);
        for (float s : stops) {
            TextView t = new TextView(this);
            t.setTag(s);
            t.setGravity(Gravity.CENTER);
            t.setTextColor(0xFFFFFFFF);
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            t.setTypeface(null, android.graphics.Typeface.BOLD);
            t.setBackgroundResource(R.drawable.bg_zoom);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(38), dp(38));
            lp.setMargins(dp(2), 0, dp(2), 0);
            t.setLayoutParams(lp);
            t.setText(fmtZoom(s));
            t.setOnClickListener(v -> {
                if (camera != null) camera.getCameraControl().setZoomRatio((Float) v.getTag());
                v.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);
            });
            t.setOnLongClickListener(v -> { openSlider(S_ZOOM); return true; });
            zoomRow.addView(t);
        }
        if (z != null) onZoomChanged(z);
    }

    private static String fmtZoom(float z) {
        if (Math.abs(z - Math.round(z)) < 0.05f) return String.valueOf(Math.round(z));
        return String.format(Locale.US, "%.1f", z);
    }

    private void onZoomChanged(ZoomState z) {
        if (extActive) return;
        float cur = z.getZoomRatio();
        int active = -1;
        for (int i = 0; i < zoomRow.getChildCount(); i++) {
            float s = (Float) zoomRow.getChildAt(i).getTag();
            if (cur >= s - 0.05f) active = i;
        }
        for (int i = 0; i < zoomRow.getChildCount(); i++) {
            TextView t = (TextView) zoomRow.getChildAt(i);
            float s = (Float) t.getTag();
            boolean on = i == active;
            t.setBackgroundResource(on ? R.drawable.bg_zoom_on : R.drawable.bg_zoom);
            t.setTextColor(on ? ContextCompat.getColor(this, R.color.accent) : 0xFFFFFFFF);
            t.setText(on ? fmtZoom(Math.round(cur * 10) / 10f) + "×" : fmtZoom(s));
        }
        if (sliderType == S_ZOOM) syncSlider();
    }

    // ------------------------------------------------------------------ kaydırıcı (EV / pro / zoom)

    private void openSlider(int type) {
        if (camera == null) return;
        if (type == S_EV && !camera.getCameraInfo().getExposureState().isExposureCompensationSupported()) return;
        sliderType = type;
        sliderPanel.setVisibility(View.VISIBLE);
        syncSlider();
        highlightProChips();
        scheduleSliderHide();
    }

    private void closeSlider() {
        sliderType = S_NONE;
        sliderPanel.setVisibility(View.GONE);
        highlightProChips();
    }

    private void scheduleSliderHide() {
        ui.removeCallbacks(hideSlider);
        if (mode != M_PRO || sliderType == S_ZOOM) ui.postDelayed(hideSlider, 4000);
    }

    private void syncSlider() {
        if (camera == null) return;
        sliderAuto.setVisibility(View.VISIBLE);
        switch (sliderType) {
            case S_EV: {
                ExposureState es = camera.getCameraInfo().getExposureState();
                Range<Integer> r = es.getExposureCompensationRange();
                slider.setMax(r.getUpper() - r.getLower());
                slider.setProgress(es.getExposureCompensationIndex() - r.getLower());
                sliderLabel.setText("EV " + evText(es.getExposureCompensationIndex(), es.getExposureCompensationStep()));
                sliderAuto.setText("0");
                break;
            }
            case S_ISO: {
                slider.setMax(Math.max(1, isoCount - 1));
                int idx = 0;
                int cur = proIso > 0 ? proIso : liveIso;
                for (int i = 0; i < isoCount; i++) if (isoList[i] <= cur) idx = i;
                slider.setProgress(idx);
                sliderLabel.setText("ISO " + (proIso > 0 ? proIso : "Oto"));
                sliderAuto.setText("Oto");
                break;
            }
            case S_SHUTTER: {
                slider.setMax(Math.max(1, expCount - 1));
                long cur = proExp > 0 ? proExp : liveExp;
                int idx = 0;
                for (int i = 0; i < expCount; i++) if (expList[i] <= cur) idx = i;
                slider.setProgress(idx);
                sliderLabel.setText("S " + (proExp > 0 ? Caps.shutterText(proExp) : "Oto"));
                sliderAuto.setText("Oto");
                break;
            }
            case S_FOCUS: {
                slider.setMax(1000);
                float f = proFocus >= 0 ? proFocus : liveFocus;
                // sol = yakın, sağ = sonsuz
                slider.setProgress(minFocusDist > 0 ? Math.round(1000 * (1 - Math.min(1f, f / minFocusDist))) : 1000);
                sliderLabel.setText("Odak " + (proFocus >= 0 ? focusText(proFocus) : "Oto"));
                sliderAuto.setText("AF");
                break;
            }
            case S_WB: {
                slider.setMax(WB_MODES.length - 1);
                slider.setProgress(proWb);
                sliderLabel.setText("BD " + WB_NAMES[proWb]);
                sliderAuto.setText("Oto");
                break;
            }
            case S_ZOOM: {
                ZoomState z = camera.getCameraInfo().getZoomState().getValue();
                if (z == null) break;
                slider.setMax(1000);
                double lmin = Math.log(z.getMinZoomRatio()), lmax = Math.log(z.getMaxZoomRatio());
                slider.setProgress((int) Math.round(1000 * (Math.log(z.getZoomRatio()) - lmin) / Math.max(0.0001, lmax - lmin)));
                sliderLabel.setText("Zoom " + String.format(Locale.US, "%.1f×", z.getZoomRatio()));
                sliderAuto.setText("1×");
                break;
            }
        }
    }

    private void onSliderChanged(int p) {
        if (camera == null) return;
        ui.removeCallbacks(hideSlider);
        switch (sliderType) {
            case S_EV: {
                Range<Integer> r = camera.getCameraInfo().getExposureState().getExposureCompensationRange();
                int idx = r.getLower() + p;
                camera.getCameraControl().setExposureCompensationIndex(idx);
                sliderLabel.setText("EV " + evText(idx, camera.getCameraInfo().getExposureState().getExposureCompensationStep()));
                break;
            }
            case S_ISO:
                if (isoCount == 0) return;
                proIso = isoList[Math.min(p, isoCount - 1)];
                sliderLabel.setText("ISO " + proIso);
                applyPro();
                break;
            case S_SHUTTER:
                if (expCount == 0) return;
                proExp = expList[Math.min(p, expCount - 1)];
                sliderLabel.setText("S " + Caps.shutterText(proExp));
                applyPro();
                break;
            case S_FOCUS:
                proFocus = minFocusDist * (1 - p / 1000f);
                sliderLabel.setText("Odak " + focusText(proFocus));
                applyPro();
                break;
            case S_WB:
                proWb = p;
                sliderLabel.setText("BD " + WB_NAMES[proWb]);
                applyPro();
                break;
            case S_ZOOM: {
                ZoomState z = camera.getCameraInfo().getZoomState().getValue();
                if (z == null) return;
                double lmin = Math.log(z.getMinZoomRatio()), lmax = Math.log(z.getMaxZoomRatio());
                float nz = (float) Math.exp(lmin + (lmax - lmin) * p / 1000.0);
                camera.getCameraControl().setZoomRatio(nz);
                sliderLabel.setText("Zoom " + String.format(Locale.US, "%.1f×", nz));
                break;
            }
        }
        refreshProChips();
    }

    private void sliderAutoPressed() {
        if (camera == null) return;
        switch (sliderType) {
            case S_EV: camera.getCameraControl().setExposureCompensationIndex(0); break;
            case S_ISO: proIso = -1; applyPro(); break;
            case S_SHUTTER: proExp = -1; applyPro(); break;
            case S_FOCUS: proFocus = -1; applyPro(); break;
            case S_WB: proWb = 0; applyPro(); break;
            case S_ZOOM: camera.getCameraControl().setZoomRatio(1f); break;
        }
        ui.postDelayed(this::syncSlider, 150);
        refreshProChips();
        scheduleSliderHide();
    }

    private static String evText(int idx, Rational step) {
        float v = idx * step.floatValue();
        if (Math.abs(v) < 0.01f) return "0";
        return (v > 0 ? "+" : "") + String.format(Locale.US, "%.1f", v);
    }

    private static String focusText(float diopter) {
        if (diopter <= 0.01f) return "∞";
        float m = 1f / diopter;
        return m < 1 ? Math.round(m * 100) + " cm" : String.format(Locale.US, "%.1f m", m);
    }

    // ------------------------------------------------------------------ pro mod

    private void readProRanges(CameraInfo info) {
        try {
            Camera2CameraInfo c2 = Camera2CameraInfo.from(info);
            isoRange = c2.getCameraCharacteristic(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE);
            expRange = c2.getCameraCharacteristic(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE);
            Float mf = c2.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE);
            minFocusDist = mf == null ? 0 : mf;
            float[] fl = c2.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS);
            float[] ap = c2.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_AVAILABLE_APERTURES);
            android.util.SizeF ss = c2.getCameraCharacteristic(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE);
            StringBuilder lt = new StringBuilder();
            if (fl != null && fl.length > 0 && ss != null)
                lt.append(Math.round(fl[0] * 43.27 / Math.hypot(ss.getWidth(), ss.getHeight()))).append("mm");
            if (ap != null && ap.length > 0) lt.append(lt.length() > 0 ? "  " : "").append(String.format(Locale.US, "f/%.1f", ap[0]));
            lensText = lt.toString();
        } catch (Exception e) {
            isoRange = null; expRange = null; minFocusDist = 0;
        }
        isoCount = 0;
        if (isoRange != null) for (int v : ISO_STOPS) if (isoRange.contains(v)) isoList[isoCount++] = v;
        expCount = 0;
        if (expRange != null) for (double s : SHUTTER_STOPS) {
            long ns = Math.round(s * 1e9);
            if (ns >= expRange.getLower() && ns <= expRange.getUpper()) expList[expCount++] = ns;
        }
    }

    private void updateProUi() {
        boolean pro = mode == M_PRO;
        proRow.setVisibility(pro ? View.VISIBLE : View.GONE);
        if (!pro) { if (sliderType != S_ZOOM && sliderType != S_EV) closeSlider(); return; }
        proChips.removeAllViews();
        addProChip(S_EV, true);
        boolean manual = sp.getBoolean(P.cap(front ? "front" : "back", "manual"), isoCount > 0);
        addProChip(S_ISO, manual && isoCount > 0);
        addProChip(S_SHUTTER, manual && expCount > 0);
        addProChip(S_FOCUS, minFocusDist > 0);
        addProChip(S_WB, true);
        refreshProChips();
    }

    private void addProChip(int type, boolean enabled) {
        if (!enabled) return;
        TextView t = new TextView(this);
        t.setTag(type);
        t.setTextColor(0xFFFFFFFF);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        t.setGravity(Gravity.CENTER);
        t.setBackgroundResource(R.drawable.bg_chip);
        t.setPadding(dp(12), dp(7), dp(12), dp(7));
        t.setFontFeatureSettings("tnum");
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(dp(4), 0, dp(4), 0);
        t.setLayoutParams(lp);
        t.setOnClickListener(v -> {
            int ty = (Integer) v.getTag();
            if (sliderType == ty) closeSlider(); else openSlider(ty);
        });
        proChips.addView(t);
    }

    private void refreshProChips() {
        if (mode != M_PRO || camera == null) return;
        for (int i = 0; i < proChips.getChildCount(); i++) {
            TextView t = (TextView) proChips.getChildAt(i);
            int ty = (Integer) t.getTag();
            String s;
            boolean manual;
            switch (ty) {
                case S_EV: {
                    ExposureState es = camera.getCameraInfo().getExposureState();
                    s = "EV " + evText(es.getExposureCompensationIndex(), es.getExposureCompensationStep());
                    manual = es.getExposureCompensationIndex() != 0;
                    break;
                }
                case S_ISO: s = "ISO " + (proIso > 0 ? proIso : (liveIso > 0 ? String.valueOf(liveIso) : "Oto")); manual = proIso > 0; break;
                case S_SHUTTER: s = "S " + (proExp > 0 ? Caps.shutterText(proExp) : (liveExp > 0 ? Caps.shutterText(liveExp) : "Oto")); manual = proExp > 0; break;
                case S_FOCUS: s = proFocus >= 0 ? "MF " + focusText(proFocus) : "AF"; manual = proFocus >= 0; break;
                default: s = "BD " + WB_NAMES[proWb]; manual = proWb != 0; break;
            }
            t.setText(s);
            t.setTextColor(manual ? ContextCompat.getColor(this, R.color.accent) : 0xFFFFFFFF);
        }
        highlightProChips();
    }

    private void highlightProChips() {
        for (int i = 0; i < proChips.getChildCount(); i++) {
            View v = proChips.getChildAt(i);
            v.setAlpha(sliderType == S_NONE || (Integer) v.getTag() == sliderType ? 1f : 0.55f);
        }
    }

    /** Elle ayarları Camera2 isteğine uygular. */
    private void applyPro() {
        if (camera == null) return;
        CaptureRequestOptions.Builder b = new CaptureRequestOptions.Builder();
        if (mode == M_PRO) {
            if (proIso > 0 || proExp > 0) {
                int iso = proIso > 0 ? proIso : (liveIso > 0 ? liveIso : 100);
                long exp = proExp > 0 ? proExp : (liveExp > 0 ? liveExp : 16_666_666L);
                if (isoRange != null) iso = isoRange.clamp(iso);
                if (expRange != null) exp = expRange.clamp(exp);
                b.setCaptureRequestOption(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_OFF);
                b.setCaptureRequestOption(CaptureRequest.SENSOR_SENSITIVITY, iso);
                b.setCaptureRequestOption(CaptureRequest.SENSOR_EXPOSURE_TIME, exp);
                b.setCaptureRequestOption(CaptureRequest.SENSOR_FRAME_DURATION, Math.max(exp, 33_333_333L));
            }
            if (proFocus >= 0) {
                b.setCaptureRequestOption(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_OFF);
                b.setCaptureRequestOption(CaptureRequest.LENS_FOCUS_DISTANCE, proFocus);
            }
            if (proWb != 0) b.setCaptureRequestOption(CaptureRequest.CONTROL_AWB_MODE, WB_MODES[proWb]);
        }
        try { Camera2CameraControl.from(camera.getCameraControl()).setCaptureRequestOptions(b.build()); } catch (Exception ignored) {}
    }

    private void analyze(ImageProxy img) {
        try {
            long now = SystemClock.uptimeMillis();
            if (mode == M_PHOTO) { scanQr(img, now); return; }
            if (now - lastHistMs < 120) return;
            lastHistMs = now;
            ImageProxy.PlaneProxy pl = img.getPlanes()[0];
            ByteBuffer buf = pl.getBuffer();
            int w = img.getWidth(), h = img.getHeight(), rs = pl.getRowStride(), ps = pl.getPixelStride();
            int[] bins = new int[64];
            for (int y = 0; y < h; y += 4) {
                int row = y * rs;
                for (int x = 0; x < w; x += 4) {
                    int idx = row + x * ps;
                    if (idx >= buf.limit()) break;
                    bins[(buf.get(idx) & 0xFF) >> 2]++;
                }
            }
            int max = 1;
            for (int i = 1; i < 63; i++) max = Math.max(max, bins[i]);
            float[] out = new float[64];
            for (int i = 0; i < 64; i++) out[i] = bins[i] / (float) max;
            ui.post(() -> histogram.setBins(out));
        } catch (Exception ignored) {
        } finally {
            img.close();
        }
    }

    // ------------------------------------------------------------------ üst çubuk

    private void cycleFlash() {
        if (mode == M_VIDEO) flash = flash == FL_TORCH ? FL_OFF : FL_TORCH;
        else if (front) flash = flash == FL_ON ? FL_OFF : FL_ON;
        else flash = (flash + 1) % 4;
        String[] names = {"Flaş kapalı", "Flaş otomatik", "Flaş açık", "Fener açık"};
        showHint(front && flash == FL_ON ? "Ekran flaşı açık" : names[flash]);
        updateTopBar();
        if (imageCapture != null) {
            try {
                if (front && flash == FL_ON) {
                    previewView.setScreenFlashWindow(getWindow());
                    imageCapture.setScreenFlash(previewView.getScreenFlash());
                }
                imageCapture.setFlashMode(imageFlashMode());
            } catch (Exception ignored) {}
        }
        applyTorch();
    }

    private void updateTopBar() {
        boolean video = mode == M_VIDEO;
        int fl = flash;
        if (video && fl != FL_TORCH) fl = FL_OFF;
        btnFlash.setImageResource(fl == FL_OFF ? R.drawable.ic_flash_off : fl == FL_AUTO ? R.drawable.ic_flash_auto
                : fl == FL_ON ? R.drawable.ic_flash_on : R.drawable.ic_torch);
        btnFlash.setColorFilter(fl == FL_OFF ? 0xFFFFFFFF : ContextCompat.getColor(this, R.color.accent));
        int se = smartExt();
        boolean hdrAvail = mode == M_PHOTO && se >= 0;
        btnHdr.setImageResource(se == ExtensionMode.HDR ? R.drawable.ic_hdr : R.drawable.ic_auto);
        btnHdr.setVisibility(hdrAvail ? View.VISIBLE : View.GONE);
        btnHdr.setColorFilter(hdrOn ? ContextCompat.getColor(this, R.color.accent) : 0xFFFFFFFF);
        btnHdr.setAlpha(hdrOn ? 1f : 0.6f);
        int t = TIMERS[timerIdx];
        btnTimer.setText(t == 0 ? "" : t + "s");
        btnTimer.getCompoundDrawablesRelative()[0].mutate().setTint(t == 0 ? 0xFFFFFFFF : ContextCompat.getColor(this, R.color.accent));
        btnAspect.setText(video ? "16:9" : ASPECT_NAMES[aspect]);
        btnAspect.setAlpha(video ? 0.4f : 1f);
        btnAspect.setEnabled(!video);
    }

    // ------------------------------------------------------------------ galeri

    private void openLast() {
        if (lastUri == null) { showHint("Henüz çekim yok"); return; }
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(lastUri, lastIsVideo ? "video/*" : "image/*");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivity(i); } catch (Exception e) { showHint("Galeri açılamadı"); }
    }

    /** Uygulamanın daha önce kaydettiği son fotoğraf/videoyu bulur. */
    private void loadLastThumb() {
        bg.execute(() -> {
            Uri best = null;
            long bestDate = -1;
            boolean bestVideo = false;
            Uri[] bases = {MediaStore.Images.Media.EXTERNAL_CONTENT_URI, MediaStore.Video.Media.EXTERNAL_CONTENT_URI};
            for (int k = 0; k < 2; k++) {
                try (Cursor c = getContentResolver().query(bases[k],
                        new String[]{MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DATE_ADDED, MediaStore.MediaColumns.OWNER_PACKAGE_NAME},
                        MediaStore.MediaColumns.OWNER_PACKAGE_NAME + "=?", new String[]{getPackageName()},
                        MediaStore.MediaColumns.DATE_ADDED + " DESC")) {
                    if (c != null && c.moveToFirst()) {
                        long d = c.getLong(1);
                        if (d > bestDate) {
                            bestDate = d;
                            best = ContentUris.withAppendedId(bases[k], c.getLong(0));
                            bestVideo = k == 1;
                        }
                    }
                } catch (Exception ignored) {}
            }
            if (best != null) {
                Uri u = best;
                boolean v = bestVideo;
                ui.post(() -> { if (lastUri == null) { lastUri = u; lastIsVideo = v; loadThumb(u, v); } });
            }
        });
    }

    private void loadThumb(Uri uri, boolean video) {
        bg.execute(() -> {
            Bitmap b = null;
            for (int i = 0; i < 3 && b == null; i++) {
                try { b = getContentResolver().loadThumbnail(uri, new Size(256, 256), null); }
                catch (Exception e) { SystemClock.sleep(200); }
            }
            Bitmap fb = b;
            ui.post(() -> {
                if (fb != null) {
                    thumb.setImageBitmap(fb);
                    thumb.setScaleX(0.6f); thumb.setScaleY(0.6f);
                    thumb.animate().scaleX(1f).scaleY(1f).setDuration(200).start();
                }
            });
        });
    }

    // ------------------------------------------------------------------ dönüş / sensörler

    private void onDeviceOrientation(int o) {
        if (o == OrientationEventListener.ORIENTATION_UNKNOWN) return;
        int rot;
        if (o >= 45 && o < 135) rot = Surface.ROTATION_270;
        else if (o >= 135 && o < 225) rot = Surface.ROTATION_180;
        else if (o >= 225 && o < 315) rot = Surface.ROTATION_90;
        else rot = Surface.ROTATION_0;
        if (rot == deviceRotation) return;
        deviceRotation = rot;
        if (imageCapture != null) imageCapture.setTargetRotation(rot);
        if (videoCapture != null && recording == null) videoCapture.setTargetRotation(rot);
        float target = rot == Surface.ROTATION_90 ? 90 : rot == Surface.ROTATION_270 ? -90 : rot == Surface.ROTATION_180 ? 180 : 0;
        // En kısa yoldan döndür
        float diff = ((target - uiRotation) % 360 + 540) % 360 - 180;
        uiRotation = uiRotation + diff;
        View[] vs = {btnFlash, btnHdr, btnTimer, btnAspect, btnGrid, btnFilter, btnSettings, btnFlip, thumb, btnPause, hint, countdown, burstCount};
        for (View v : vs) v.animate().rotation(uiRotation).setDuration(250).start();
        overlay.setUiRotation(target);
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        float x = e.values[0], y = e.values[1], z = e.values[2];
        float g = (float) Math.sqrt(x * x + y * y + z * z);
        if (g < 1 || Math.abs(z) / g > 0.85f) { overlay.setLevel(Float.NaN); return; } // telefon yatay masada
        double ang = Math.toDegrees(Math.atan2(x, y)); // dik tutulunca 0
        double dev = ang - Math.round(ang / 90.0) * 90.0;
        overlay.setLevel((float) dev);
    }

    @Override public void onAccuracyChanged(Sensor s, int a) {}

    // ------------------------------------------------------------------ tuşlar

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        String vk = sp.getString(P.VOLUME_KEYS, "shutter");
        boolean vol = keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN;
        if (keyCode == KeyEvent.KEYCODE_CAMERA || (vol && "shutter".equals(vk))) {
            if (event.getRepeatCount() == 0) onShutter();
            return true;
        }
        if (vol && "zoom".equals(vk) && camera != null && extActive) {
            setDigitalZoom(digitalZoom * (keyCode == KeyEvent.KEYCODE_VOLUME_UP ? 1.1f : 1 / 1.1f));
            return true;
        }
        if (vol && "zoom".equals(vk) && camera != null) {
            ZoomState z = camera.getCameraInfo().getZoomState().getValue();
            if (z != null) {
                float f = keyCode == KeyEvent.KEYCODE_VOLUME_UP ? 1.1f : 1 / 1.1f;
                camera.getCameraControl().setZoomRatio(Math.max(z.getMinZoomRatio(), Math.min(z.getMaxZoomRatio(), z.getZoomRatio() * f)));
            }
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        String vk = sp.getString(P.VOLUME_KEYS, "shutter");
        boolean vol = keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN;
        if (keyCode == KeyEvent.KEYCODE_CAMERA || (vol && !"off".equals(vk))) return true;
        return super.onKeyUp(keyCode, event);
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (countDownTimer != null) { cancelTimer(); return; }
        if (sliderPanel.getVisibility() == View.VISIBLE && mode != M_PRO) { closeSlider(); return; }
        if (recording != null) { stopRecording(); return; }
        super.onBackPressed();
    }

    // ------------------------------------------------------------------ yardımcılar

    private void showHint(String s) { showHint(s, 1400); }

    private void showHint(String s, long ms) {
        hint.setText(s);
        hint.setRotation(uiRotation);
        hint.setVisibility(View.VISIBLE);
        ui.removeCallbacks(hideHint);
        ui.postDelayed(hideHint, ms);
    }

    private void hideHintNow() { ui.removeCallbacks(hideHint); hint.setVisibility(View.GONE); }

    private int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @SuppressWarnings("unused")
    private void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }

    // ------------------------------------------------------------------ v2: akıllı sahne

    /** Fotoğraf modundaki üst düğmenin kullanacağı üretici modu: HDR yoksa Akıllı (Oto). */
    private int smartExt() {
        if (extAvailable(ExtensionMode.HDR)) return ExtensionMode.HDR;
        if (extAvailable(ExtensionMode.AUTO)) return ExtensionMode.AUTO;
        return -1;
    }

    // ------------------------------------------------------------------ v2: dijital zoom (üretici modları)

    private static final float[] DIGITAL_STOPS = {1f, 1.5f, 2f, 3f, 4f};

    private void buildDigitalZoomChips() {
        zoomRow.setVisibility(View.VISIBLE);
        for (float s : DIGITAL_STOPS) {
            TextView t = new TextView(this);
            t.setTag(s);
            t.setGravity(Gravity.CENTER);
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            t.setTypeface(null, android.graphics.Typeface.BOLD);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(38), dp(38));
            lp.setMargins(dp(2), 0, dp(2), 0);
            t.setLayoutParams(lp);
            t.setOnClickListener(v -> { setDigitalZoom((Float) v.getTag()); v.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK); });
            zoomRow.addView(t);
        }
        setDigitalZoom(digitalZoom);
    }

    private void setDigitalZoom(float z) {
        digitalZoom = Math.max(1f, Math.min(4f, z));
        previewView.setScaleX(digitalZoom);
        previewView.setScaleY(digitalZoom);
        int active = 0;
        for (int i = 0; i < zoomRow.getChildCount(); i++) if (digitalZoom >= (Float) zoomRow.getChildAt(i).getTag() - 0.05f) active = i;
        for (int i = 0; i < zoomRow.getChildCount(); i++) {
            TextView t = (TextView) zoomRow.getChildAt(i);
            boolean on = i == active;
            t.setBackgroundResource(on ? R.drawable.bg_zoom_on : R.drawable.bg_zoom);
            t.setTextColor(on ? ContextCompat.getColor(this, R.color.accent) : 0xFFFFFFFF);
            t.setText(on ? fmtZoom(Math.round(digitalZoom * 10) / 10f) + "×" : fmtZoom((Float) t.getTag()));
        }
    }

    // ------------------------------------------------------------------ v2: filtreler

    private void buildFilterChips() {
        filterChips.removeAllViews();
        for (int i = 0; i < Filters.count(); i++) {
            TextView t = new TextView(this);
            t.setText(Filters.NAMES[i]);
            t.setTag(i);
            t.setGravity(Gravity.CENTER);
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
            t.setPadding(dp(12), dp(7), dp(14), dp(7));
            GradientDrawable dot = new GradientDrawable();
            dot.setShape(GradientDrawable.OVAL);
            dot.setColor(Filters.SWATCH[i]);
            dot.setSize(dp(14), dp(14));
            t.setCompoundDrawablesRelativeWithIntrinsicBounds(dot, null, null, null);
            t.setCompoundDrawablePadding(dp(6));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(dp(3), 0, dp(3), 0);
            t.setLayoutParams(lp);
            t.setOnClickListener(v -> {
                filterIdx = (Integer) v.getTag();
                highlightFilters();
                applyPreviewFilter();
                v.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);
            });
            filterChips.addView(t);
        }
        highlightFilters();
    }

    private void highlightFilters() {
        for (int i = 0; i < filterChips.getChildCount(); i++) {
            TextView t = (TextView) filterChips.getChildAt(i);
            boolean on = (Integer) t.getTag() == filterIdx;
            GradientDrawable bgd = new GradientDrawable();
            bgd.setCornerRadius(dp(18));
            bgd.setColor(on ? 0x99000000 : 0x40000000);
            if (on) bgd.setStroke(dp(1), ContextCompat.getColor(this, R.color.accent));
            t.setBackground(bgd);
            t.setTextColor(on ? ContextCompat.getColor(this, R.color.accent) : 0xFFFFFFFF);
        }
        btnFilter.setColorFilter(filterIdx != 0 ? ContextCompat.getColor(this, R.color.accent) : 0xFFFFFFFF);
    }

    private void schedulePreviewFilter() {
        highlightFilters();
        ui.postDelayed(this::applyPreviewFilter, 300);
        ui.postDelayed(this::applyPreviewFilter, 1200);
    }

    /** Vizörde canlı filtre: önizleme TextureView'ına renk matrisi uygular. */
    private void applyPreviewFilter() {
        int f = mode == M_VIDEO ? 0 : filterIdx;
        TextureView tv = findTexture(previewView);
        if (tv != null) {
            android.graphics.ColorMatrix cm = Filters.matrix(f);
            if (cm == null) tv.setLayerPaint(null);
            else {
                Paint p = new Paint();
                p.setColorFilter(new ColorMatrixColorFilter(cm));
                tv.setLayerPaint(p);
            }
        }
        overlay.setVignette(Filters.VIGNETTE[f]);
    }

    private static TextureView findTexture(View v) {
        if (v instanceof TextureView) return (TextureView) v;
        if (v instanceof ViewGroup) {
            ViewGroup g = (ViewGroup) v;
            for (int i = 0; i < g.getChildCount(); i++) {
                TextureView t = findTexture(g.getChildAt(i));
                if (t != null) return t;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------ v2: kayıt sonrası işlem

    private PostProcessor.Job makeJob() {
        PostProcessor.Job j = new PostProcessor.Job();
        j.zoom = extActive ? digitalZoom : 1f;
        j.filter = mode == M_VIDEO ? 0 : filterIdx;
        j.watermark = P.i(sp, P.WATERMARK, 0);
        String custom = sp.getString(P.WATERMARK_TEXT, "").trim();
        j.brand = custom.isEmpty() ? deviceName() : custom;
        j.lens = lensText;
        j.quality = Math.max(50, Math.min(100, P.i(sp, P.JPEG_QUALITY, 95)));
        return j;
    }

    private String deviceName() {
        try {
            String n = Settings.Global.getString(getContentResolver(), "device_name");
            if (n != null && !n.trim().isEmpty()) return n.trim();
        } catch (Exception ignored) {}
        String m = android.os.Build.MODEL;
        String b = android.os.Build.MANUFACTURER;
        return m.toLowerCase(Locale.US).startsWith(b.toLowerCase(Locale.US)) ? m : capitalize(b) + " " + m;
    }

    private static String capitalize(String s) { return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1); }

    private void postProcess(PostProcessor.Job job) {
        postExec.execute(() -> {
            Bitmap t = null;
            try { t = PostProcessor.run(this, job); } catch (Throwable e) {
                ui.post(() -> showHint("Filtre/filigran uygulanamadı, fotoğraf orijinal kaldı"));
            }
            Bitmap ft = t;
            ui.post(() -> {
                if (ft != null) {
                    thumb.setImageBitmap(ft);
                    thumb.setScaleX(0.6f); thumb.setScaleY(0.6f);
                    thumb.animate().scaleX(1f).scaleY(1f).setDuration(200).start();
                } else loadThumb(job.uri, false);
            });
        });
    }

    // ------------------------------------------------------------------ v2: seri çekim

    private void burstStart() {
        if (camera == null || imageCapture == null || mode == M_VIDEO || countDownTimer != null) return;
        if (extActive) { showHint("Seri çekim bu modda yok"); onShutter(); return; }
        burst = true;
        burstShots = 0;
        burstCount.setText("0");
        burstCount.setVisibility(View.VISIBLE);
        burstCount.setRotation(uiRotation);
        burstNext();
    }

    private void burstNext() {
        if (!burst) return;
        if (burstShots >= 60) { burstEnd(); return; }
        takePhoto(true);
    }

    private void burstEnd() {
        if (!burst) return;
        burst = false;
        shutter.setBusy(false);
        burstCount.animate().cancel();
        ui.postDelayed(() -> { if (!burst) burstCount.setVisibility(View.GONE); }, 700);
        if (burstShots > 0) showHint(burstShots + " fotoğraf çekildi");
    }

    // ------------------------------------------------------------------ v2: QR kod

    private void scanQr(ImageProxy img, long now) {
        if (now - lastQrMs < 250) return;
        lastQrMs = now;
        if (qrReader == null) {
            qrReader = new MultiFormatReader();
            Map<DecodeHintType, Object> h = new EnumMap<>(DecodeHintType.class);
            h.put(DecodeHintType.POSSIBLE_FORMATS, java.util.Arrays.asList(com.google.zxing.BarcodeFormat.QR_CODE));
            qrReader.setHints(h);
        }
        ImageProxy.PlaneProxy pl = img.getPlanes()[0];
        int w = img.getWidth(), h = img.getHeight(), rs = pl.getRowStride();
        if (qrBuf == null || qrBuf.length != w * h) qrBuf = new byte[w * h];
        ByteBuffer b = pl.getBuffer();
        for (int y = 0; y < h; y++) {
            b.position(y * rs);
            b.get(qrBuf, y * w, Math.min(w, b.remaining()));
        }
        try {
            Result r = qrReader.decodeWithState(new BinaryBitmap(new HybridBinarizer(
                    new PlanarYUVLuminanceSource(qrBuf, w, h, 0, 0, w, h, false))));
            String text = r.getText();
            ui.post(() -> showQr(text));
        } catch (Exception ignored) {
        } finally {
            qrReader.reset();
        }
    }

    private void showQr(String text) {
        if (text == null || mode != M_PHOTO) return;
        boolean isNew = !text.equals(qrText);
        qrText = text;
        String shown = text.startsWith("WIFI:") ? "Wi-Fi ağı: " + wifiName(text) : text;
        qrChip.setText("QR  ›  " + shown);
        if (isNew || qrChip.getVisibility() != View.VISIBLE) {
            qrChip.setVisibility(View.VISIBLE);
            qrChip.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);
        }
        ui.removeCallbacks(hideQr);
        ui.postDelayed(hideQr, 2500);
    }

    private static String wifiName(String t) {
        int i = t.indexOf("S:");
        if (i < 0) return "?";
        int e = t.indexOf(';', i);
        return t.substring(i + 2, e < 0 ? t.length() : e);
    }

    private void onQrClick() {
        String t = qrText;
        if (t == null) return;
        ui.removeCallbacks(hideQr);
        String lower = t.toLowerCase(Locale.US);
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(t))); return; } catch (Exception ignored) {}
        }
        String msg = t;
        if (t.startsWith("WIFI:")) {
            int pi = t.indexOf("P:");
            String pass = pi < 0 ? "" : t.substring(pi + 2, Math.max(pi + 2, t.indexOf(';', pi) < 0 ? t.length() : t.indexOf(';', pi)));
            msg = "Ağ: " + wifiName(t) + (pass.isEmpty() ? "" : "\nŞifre: " + pass);
            t = pass.isEmpty() ? wifiName(t) : pass;
        }
        final String copy = t;
        new androidx.appcompat.app.AlertDialog.Builder(this).setTitle("QR kod").setMessage(msg)
                .setPositiveButton("Kopyala", (d, w) -> {
                    ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    cm.setPrimaryClip(ClipData.newPlainText("QR", copy));
                    showHint("Kopyalandı");
                })
                .setNeutralButton("Paylaş", (d, w) -> startActivity(Intent.createChooser(
                        new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, qrTextOr(copy)), "Paylaş")))
                .setNegativeButton("Kapat", null).show();
    }

    private String qrTextOr(String s) { return qrText != null ? qrText : s; }

    // ------------------------------------------------------------------ v2: konum

    @SuppressLint("MissingPermission")
    private void startLocation() {
        if (!sp.getBoolean(P.LOCATION, false)) return;
        boolean fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!fine && !coarse) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 2);
            return;
        }
        if (locationManager == null) locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        for (String prov : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
            try {
                if (!locationManager.isProviderEnabled(prov)) continue;
                Location l = locationManager.getLastKnownLocation(prov);
                if (l != null && (lastLocation == null || l.getTime() > lastLocation.getTime())) lastLocation = l;
                locationManager.requestLocationUpdates(prov, 5000, 10, locListener, Looper.getMainLooper());
            } catch (Exception ignored) {}
        }
    }

    private void stopLocation() {
        if (locationManager != null) try { locationManager.removeUpdates(locListener); } catch (Exception ignored) {}
    }
}
