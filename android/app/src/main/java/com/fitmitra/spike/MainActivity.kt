package com.fitmitra.spike

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.activity.viewModels
import com.fitmitra.spike.theme.FitMitraTheme
import com.fitmitra.spike.ui.SpikeScreen
import com.fitmitra.spike.ui.SpikeViewModel

class MainActivity : ComponentActivity() {
  private val viewModel: SpikeViewModel by viewModels()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    enableEdgeToEdge()
    setContent {
      FitMitraTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
          SpikeScreen(viewModel = viewModel)
        }
      }
    }
  }
}
