package com.pachax.flow;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.pachax.flow.plugins.PachaxBluetoothPermissionsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PachaxBluetoothPermissionsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
